package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type DeployRequest struct {
	GitHubURL string            `json:"github_url"`
	Name      string            `json:"name"`
	Branch    string            `json:"branch,omitempty"`
	EnvVars   map[string]string `json:"env_vars,omitempty"`
}

type DeployStatus struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	Status            string   `json:"status"` // "queued", "cloning", "building", "running", "failed", "stopped"
	BuildSystem       string   `json:"build_system,omitempty"`
	DetectedProviders []string `json:"detected_providers,omitempty"`
	Logs              string   `json:"logs,omitempty"`
	URL               string   `json:"url,omitempty"`
	Error             string   `json:"error,omitempty"`
	CreatedAt         string   `json:"created_at"`
	UpdatedAt         string   `json:"updated_at"`
}

type deploymentRuntime struct {
	containerName string
	imageName     string
	cmd           *exec.Cmd
	cancel        context.CancelFunc
	port          string
	logPath       string
}

type DeployService struct {
	mu          sync.RWMutex
	deployments map[string]*DeployStatus
	runtimes    map[string]*deploymentRuntime
	portsInUse  map[string]string
	baseDir     string
}

var errDeploymentNotFound = errors.New("deployment not found")

var deploymentPortPool = []string{"8081", "8082", "8083", "8084", "8085"}

func deploymentBaseDir() string {
	if override := strings.TrimSpace(os.Getenv("APWHY_DEPLOY_BASE_DIR")); override != "" {
		return override
	}
	return filepath.Join(os.TempDir(), "deployments")
}

func NewDeployService() *DeployService {
	return &DeployService{
		deployments: make(map[string]*DeployStatus),
		runtimes:    make(map[string]*deploymentRuntime),
		portsInUse:  make(map[string]string),
		baseDir:     deploymentBaseDir(),
	}
}

func (s *DeployService) CreateDeployment(_ context.Context, req DeployRequest) (*DeployStatus, error) {
	// Validate request
	if req.GitHubURL == "" {
		return nil, fmt.Errorf("github_url is required")
	}
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	// Check if URL is valid GitHub URL
	if !strings.HasPrefix(req.GitHubURL, "https://github.com/") && !strings.HasPrefix(req.GitHubURL, "http://github.com/") {
		return nil, fmt.Errorf("invalid github_url, must be a valid GitHub URL")
	}

	// Generate unique ID
	id := uuid.New().String()

	// Create deployment status
	now := time.Now().UTC().Format(time.RFC3339)
	deployment := &DeployStatus{
		ID:        id,
		Name:      req.Name,
		Status:    "queued",
		CreatedAt: now,
		UpdatedAt: now,
	}

	s.mu.Lock()
	s.deployments[id] = deployment
	s.mu.Unlock()

	// Start deployment in background
	go s.deployInBackground(context.Background(), id, req)

	deploymentCopy := *deployment
	return &deploymentCopy, nil
}

func (s *DeployService) deployInBackground(ctx context.Context, id string, req DeployRequest) {
	deploymentDir := filepath.Join(s.baseDir, id)
	repoDir := filepath.Join(deploymentDir, "repo")
	logPath := filepath.Join(deploymentDir, "runtime.log")

	if err := os.MkdirAll(repoDir, 0o755); err != nil {
		s.setFailure(id, fmt.Sprintf("Failed to create deployment directory: %v", err))
		return
	}

	port, err := s.reservePort(id)
	if err != nil {
		s.setFailure(id, err.Error())
		return
	}
	releasePort := true
	defer func() {
		if releasePort {
			s.releasePort(id, port)
		}
	}()

	if err := s.cloneRepository(ctx, id, req, repoDir); err != nil {
		s.setFailure(id, err.Error())
		return
	}

	if err := s.deployWithRailpack(ctx, id, repoDir, port, req, logPath); err == nil {
		releasePort = false
		return
	} else {
		s.appendLog(id, fmt.Sprintf("Railpack deploy failed: %v", err))
	}

	if _, err := os.Stat(filepath.Join(repoDir, "go.mod")); err != nil {
		s.setFailure(id, "Railpack deployment failed and no Go fallback detected (missing go.mod).")
		return
	}

	if err := s.deployWithGo(ctx, id, repoDir, port, req, logPath); err != nil {
		s.setFailure(id, err.Error())
		return
	}

	releasePort = false
}

func (s *DeployService) cloneRepository(ctx context.Context, id string, req DeployRequest, repoDir string) error {
	repoName := repoNameFromURL(req.GitHubURL)
	branchLabel := "default"
	args := []string{"clone", "--depth", "1"}
	if branch := strings.TrimSpace(req.Branch); branch != "" {
		args = append(args, "--branch", branch)
		branchLabel = branch
	}
	args = append(args, req.GitHubURL, repoDir)

	s.updateStatus(id, "cloning", "", "")
	s.appendLog(id, fmt.Sprintf("Cloning %s from %s (branch: %s)", repoName, req.GitHubURL, branchLabel))

	cmd := exec.CommandContext(ctx, "git", args...)
	output, err := cmd.CombinedOutput()
	s.appendCommandOutput(id, "git "+strings.Join(args, " "), output)
	if err != nil {
		return fmt.Errorf("failed to clone repository: %w", err)
	}
	return nil
}

func (s *DeployService) deployWithRailpack(ctx context.Context, id, repoDir, port string, req DeployRequest, logPath string) error {
	if _, err := exec.LookPath("railpack"); err != nil {
		return fmt.Errorf("railpack CLI is not installed")
	}
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("docker CLI is not installed")
	}

	s.updateBuildInfo(id, "railpack", nil)
	s.updateStatus(id, "building", "", "")
	s.appendLog(id, "Building container image with Railpack...")

	if providers, err := detectRailpackProviders(ctx, repoDir); err == nil && len(providers) > 0 {
		s.updateBuildInfo(id, "railpack", providers)
		s.appendLog(id, fmt.Sprintf("Railpack detected providers: %s", strings.Join(providers, ", ")))
	}

	imageName := fmt.Sprintf("apwhy-%s", shortID(id))
	buildArgs := []string{"build", repoDir, "--name", imageName, "--progress", "plain"}
	for _, kv := range envPairs(req.EnvVars) {
		buildArgs = append(buildArgs, "--env", kv)
	}

	buildCmd := exec.CommandContext(ctx, "railpack", buildArgs...)
	buildOutput, err := buildCmd.CombinedOutput()
	s.appendCommandOutput(id, "railpack "+strings.Join(buildArgs, " "), buildOutput)
	if err != nil {
		return fmt.Errorf("railpack build failed: %w", err)
	}

	containerName := fmt.Sprintf("apwhy-deploy-%s", shortID(id))
	_ = exec.CommandContext(ctx, "docker", "rm", "-f", containerName).Run()

	runArgs := []string{
		"run", "-d",
		"--name", containerName,
		"-p", fmt.Sprintf("127.0.0.1:%s:%s", port, port),
		"-e", "PORT=" + port,
	}
	for _, kv := range envPairs(req.EnvVars) {
		runArgs = append(runArgs, "-e", kv)
	}
	runArgs = append(runArgs, imageName)

	runCmd := exec.CommandContext(ctx, "docker", runArgs...)
	runOutput, err := runCmd.CombinedOutput()
	s.appendCommandOutput(id, "docker "+strings.Join(runArgs, " "), runOutput)
	if err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	s.storeRuntime(id, &deploymentRuntime{
		containerName: containerName,
		imageName:     imageName,
		port:          port,
		logPath:       logPath,
	})

	s.updateStatus(id, "running", "http://localhost:"+port, fmt.Sprintf("Deployment running in container %s", containerName))
	go s.watchContainer(id, containerName, port)
	return nil
}

func (s *DeployService) deployWithGo(_ context.Context, id, repoDir, port string, req DeployRequest, logPath string) error {
	if _, err := exec.LookPath("go"); err != nil {
		return fmt.Errorf("go toolchain is not installed")
	}

	s.updateBuildInfo(id, "go", []string{"go"})
	s.updateStatus(id, "building", "", "Building Go binary...")

	buildCmd := exec.Command("go", "build", "-o", "app", ".")
	buildCmd.Dir = repoDir

	buildOutput, err := buildCmd.CombinedOutput()
	s.appendCommandOutput(id, "go build -o app .", buildOutput)
	if err != nil {
		return fmt.Errorf("failed to build Go application: %w", err)
	}

	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return fmt.Errorf("failed to open runtime log file: %w", err)
	}

	runCtx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(runCtx, filepath.Join(repoDir, "app"))
	cmd.Dir = repoDir
	cmd.Stdout = logFile
	cmd.Stderr = logFile
	cmd.Env = mergedRuntimeEnv(req.EnvVars, port)

	if err := cmd.Start(); err != nil {
		_ = logFile.Close()
		cancel()
		return fmt.Errorf("failed to start Go binary: %w", err)
	}

	s.storeRuntime(id, &deploymentRuntime{
		cmd:     cmd,
		cancel:  cancel,
		port:    port,
		logPath: logPath,
	})
	s.updateStatus(id, "running", "http://localhost:"+port, fmt.Sprintf("Deployment running as local process on port %s", port))

	go func() {
		err := cmd.Wait()
		_ = logFile.Close()
		s.handleProcessExit(id, port, err)
	}()

	return nil
}

func (s *DeployService) watchContainer(id, containerName, port string) {
	waitCmd := exec.Command("docker", "wait", containerName)
	waitOutput, err := waitCmd.CombinedOutput()
	exitCode := strings.TrimSpace(string(waitOutput))

	logsCmd := exec.Command("docker", "logs", containerName)
	logsOutput, _ := logsCmd.CombinedOutput()
	if len(logsOutput) > 0 {
		s.appendCommandOutput(id, "docker logs "+containerName, logsOutput)
	}

	currentStatus := s.getStatus(id)
	if currentStatus == "stopped" {
		s.clearRuntime(id)
		s.releasePort(id, port)
		return
	}

	if err != nil {
		s.setFailure(id, fmt.Sprintf("container wait failed: %v", err))
		s.clearRuntime(id)
		s.releasePort(id, port)
		return
	}

	if exitCode != "" && exitCode != "0" {
		s.setFailure(id, fmt.Sprintf("container exited with code %s", exitCode))
	} else {
		s.updateStatus(id, "stopped", "", "Container exited")
	}
	s.clearRuntime(id)
	s.releasePort(id, port)
}

func (s *DeployService) handleProcessExit(id, port string, err error) {
	status := s.getStatus(id)
	if status == "stopped" {
		s.clearRuntime(id)
		s.releasePort(id, port)
		return
	}

	if err != nil {
		s.setFailure(id, fmt.Sprintf("process exited: %v", err))
	} else {
		s.updateStatus(id, "stopped", "", "Process exited")
	}
	s.clearRuntime(id)
	s.releasePort(id, port)
}

func (s *DeployService) GetDeployment(id string) (*DeployStatus, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	deployment, exists := s.deployments[id]
	if !exists {
		return nil, false
	}
	copy := *deployment
	return &copy, true
}

func (s *DeployService) ListDeployments() map[string]*DeployStatus {
	// Return a copy to avoid external modification
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make(map[string]*DeployStatus)
	for id, deployment := range s.deployments {
		deploymentCopy := *deployment
		result[id] = &deploymentCopy
	}
	return result
}

func (s *DeployService) StopDeployment(ctx context.Context, id string) error {
	if _, exists := s.GetDeployment(id); !exists {
		return fmt.Errorf("%w: %s", errDeploymentNotFound, id)
	}

	runtime := s.getRuntime(id)
	if runtime != nil {
		if runtime.cancel != nil {
			runtime.cancel()
		}
		if runtime.cmd != nil && runtime.cmd.Process != nil {
			_ = runtime.cmd.Process.Kill()
		}
		if runtime.containerName != "" {
			stopCmd := exec.CommandContext(ctx, "docker", "rm", "-f", runtime.containerName)
			output, err := stopCmd.CombinedOutput()
			s.appendCommandOutput(id, "docker rm -f "+runtime.containerName, output)
			if err != nil {
				return fmt.Errorf("failed to stop container: %w", err)
			}
		}
		s.clearRuntime(id)
		if runtime.port != "" {
			s.releasePort(id, runtime.port)
		}
	}

	s.updateStatus(id, "stopped", "", "Deployment stopped")
	return nil
}

func (s *DeployService) GetDeploymentLogs(ctx context.Context, id string, lines int) (string, error) {
	deployment, exists := s.GetDeployment(id)
	if !exists {
		return "", fmt.Errorf("%w: %s", errDeploymentNotFound, id)
	}

	runtime := s.getRuntime(id)
	if runtime != nil {
		if runtime.containerName != "" {
			args := []string{"logs"}
			if lines > 0 {
				args = append(args, "--tail", strconv.Itoa(lines))
			}
			args = append(args, runtime.containerName)
			output, err := exec.CommandContext(ctx, "docker", args...).CombinedOutput()
			if err == nil && strings.TrimSpace(string(output)) != "" {
				return strings.TrimSpace(string(output)), nil
			}
		}

		if runtime.logPath != "" {
			if bytes, err := os.ReadFile(runtime.logPath); err == nil {
				return tailLines(string(bytes), lines), nil
			}
		}
	}

	if deployment.Logs != "" {
		return tailLines(deployment.Logs, lines), nil
	}

	return "No logs available", nil
}

func (s *DeployService) updateStatus(id, status, url, logLine string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	deployment, exists := s.deployments[id]
	if !exists {
		return
	}

	deployment.Status = status
	deployment.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	if url != "" {
		deployment.URL = url
	}
	if logLine != "" {
		deployment.Logs = appendLogLine(deployment.Logs, logLine)
	}
	if status != "failed" {
		deployment.Error = ""
	}
}

func (s *DeployService) updateBuildInfo(id, buildSystem string, providers []string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	deployment, exists := s.deployments[id]
	if !exists {
		return
	}
	deployment.BuildSystem = buildSystem
	if providers != nil {
		deployment.DetectedProviders = providers
	}
	deployment.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

func (s *DeployService) appendLog(id, line string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	deployment, exists := s.deployments[id]
	if !exists {
		return
	}
	deployment.Logs = appendLogLine(deployment.Logs, line)
	deployment.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

func (s *DeployService) setFailure(id, message string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	deployment, exists := s.deployments[id]
	if !exists {
		return
	}
	deployment.Status = "failed"
	deployment.Error = message
	deployment.Logs = appendLogLine(deployment.Logs, message)
	deployment.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
}

func (s *DeployService) storeRuntime(id string, runtime *deploymentRuntime) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.runtimes[id] = runtime
}

func (s *DeployService) clearRuntime(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.runtimes, id)
}

func (s *DeployService) getRuntime(id string) *deploymentRuntime {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.runtimes[id]
}

func (s *DeployService) getStatus(id string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	deployment, exists := s.deployments[id]
	if !exists {
		return ""
	}
	return deployment.Status
}

func (s *DeployService) reservePort(id string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, port := range deploymentPortPool {
		if owner, inUse := s.portsInUse[port]; inUse && owner != id {
			continue
		}
		if isPortInUse(port) {
			continue
		}
		s.portsInUse[port] = id
		return port, nil
	}
	return "", fmt.Errorf("no deployment ports available (tried: %s)", strings.Join(deploymentPortPool, ", "))
}

func (s *DeployService) releasePort(id, port string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	owner, exists := s.portsInUse[port]
	if !exists {
		return
	}
	if owner == id {
		delete(s.portsInUse, port)
	}
}

func isPortInUse(port string) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, 250*time.Millisecond)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

func detectRailpackProviders(ctx context.Context, repoDir string) ([]string, error) {
	infoCmd := exec.CommandContext(ctx, "railpack", "info", "--format", "json", repoDir)
	output, err := infoCmd.CombinedOutput()
	if err != nil {
		return nil, err
	}
	var parsed struct {
		DetectedProviders []string `json:"detectedProviders"`
	}
	if err := json.Unmarshal(output, &parsed); err != nil {
		return nil, err
	}
	return parsed.DetectedProviders, nil
}

func repoNameFromURL(raw string) string {
	parts := strings.Split(strings.TrimSuffix(strings.TrimSpace(raw), "/"), "/")
	repo := parts[len(parts)-1]
	return strings.TrimSuffix(repo, ".git")
}

func shortID(id string) string {
	compact := strings.ReplaceAll(id, "-", "")
	if len(compact) <= 8 {
		return compact
	}
	return compact[:8]
}

func envPairs(envVars map[string]string) []string {
	if len(envVars) == 0 {
		return nil
	}
	keys := make([]string, 0, len(envVars))
	for key := range envVars {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	pairs := make([]string, 0, len(keys))
	for _, key := range keys {
		pairs = append(pairs, fmt.Sprintf("%s=%s", key, envVars[key]))
	}
	return pairs
}

func mergedRuntimeEnv(envVars map[string]string, port string) []string {
	out := append([]string{}, os.Environ()...)
	hasPort := false
	for _, item := range out {
		if strings.HasPrefix(item, "PORT=") {
			hasPort = true
			break
		}
	}
	for _, kv := range envPairs(envVars) {
		if strings.HasPrefix(kv, "PORT=") {
			hasPort = true
		}
		out = append(out, kv)
	}
	if !hasPort {
		out = append(out, "PORT="+port)
	}
	return out
}

func appendLogLine(existing, line string) string {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return existing
	}
	next := trimmed
	if existing != "" {
		next = existing + "\n" + trimmed
	}

	const maxBytes = 128 * 1024
	if len(next) <= maxBytes {
		return next
	}
	return next[len(next)-maxBytes:]
}

func formatCommandOutput(command string, output []byte) string {
	trimmed := strings.TrimSpace(string(output))
	if trimmed == "" {
		return ""
	}
	return fmt.Sprintf("$ %s\n%s", command, trimmed)
}

func (s *DeployService) appendCommandOutput(id, command string, output []byte) {
	if line := formatCommandOutput(command, output); line != "" {
		s.appendLog(id, line)
	}
}

func tailLines(content string, lines int) string {
	if lines <= 0 {
		return strings.TrimSpace(content)
	}
	rawLines := strings.Split(strings.TrimSpace(content), "\n")
	if len(rawLines) <= lines {
		return strings.Join(rawLines, "\n")
	}
	return strings.Join(rawLines[len(rawLines)-lines:], "\n")
}
