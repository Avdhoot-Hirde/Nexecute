package com.Nexecute.NexecuteServer.Service;

import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;

/** Host commands are fixed; user source is only executed inside Linux containers. */
@Service
public class DockerExecutionService {
    public static final int MAX_SOURCE = 65536, MAX_INPUT = 65536, MAX_OUTPUT = 262144;
    private final String image;
    private final Semaphore slots = new Semaphore(4);
    private final Set<Execution> active = ConcurrentHashMap.newKeySet();
    private final ExecutorService workers = Executors.newVirtualThreadPerTaskExecutor();
    public DockerExecutionService(@Value("${sandbox.image:nexecute-sandbox:local}") String image) { this.image = image; }
    public record Result(String stdout, String stderr, int exitCode, String status) {}

    public static String fileName(String language) {
        if (language == null) throw new IllegalArgumentException("Language is required.");
        return switch (language) {
            case "python" -> "Solution.py";
            case "javascript" -> "Solution.js";
            case "java" -> "Solution.java";
            case "cpp" -> "Solution.cpp";
            case "c" -> "Solution.c";
            case "go" -> "Solution.go";
            case "rust" -> "Solution.rs";
            case "ruby" -> "Solution.rb";
            case "php" -> "Solution.php";
            case "typescript" -> "Solution.ts";
            default -> throw new IllegalArgumentException("Supported languages: python, java, cpp, javascript, c, go, rust, ruby, php, typescript.");
        };
    }
    public Execution prepare(String language, String code, String stdin, boolean interactive, BiConsumer<String, String> output) {
        return prepare(language, code, stdin, null, interactive, output);
    }
    public static String sourceFileName(String language, String requested) {
        String fallback = fileName(language);
        if (requested == null) return fallback;
        String extension = fallback.substring(fallback.lastIndexOf('.'));
        if (requested.length() > 128 || !requested.matches("[A-Za-z_$][A-Za-z0-9_$.-]*")
                || requested.contains("..") || !requested.endsWith(extension))
            throw new IllegalArgumentException("Use a simple filename ending in " + extension + " without folders or spaces.");
        String stem = requested.substring(0, requested.length() - extension.length());
        if (stem.matches("(?i)(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\\..*)?"))
            throw new IllegalArgumentException("This filename is reserved. Choose another name.");
        if (language.equals("java") && (!stem.matches("[A-Za-z_$][A-Za-z0-9_$]*")
                || javax.lang.model.SourceVersion.isKeyword(stem)))
            throw new IllegalArgumentException("The Java filename must match a valid class name, for example Main.java.");
        return requested;
    }
    public Execution prepare(String language, String code, String stdin, String file, boolean interactive, BiConsumer<String, String> output) {
        String sourceFile = sourceFileName(language, file);
        if (code == null || code.isBlank() || code.getBytes(StandardCharsets.UTF_8).length > MAX_SOURCE)
            throw new IllegalArgumentException("Code must contain 1–65536 UTF-8 bytes.");
        if (stdin != null && stdin.getBytes(StandardCharsets.UTF_8).length > MAX_INPUT)
            throw new IllegalArgumentException("Input exceeds 65536 UTF-8 bytes.");
        if (!slots.tryAcquire()) throw new RejectedExecutionException("Execution capacity reached. Try again shortly.");
        Execution execution = new Execution(language, code, stdin == null ? "" : stdin, sourceFile, interactive, output);
        active.add(execution);
        return execution;
    }
    public final class Execution implements AutoCloseable {
        private final String name = "nexecute-" + UUID.randomUUID();
        private final String language, code, initialInput, sourceFile;
        private final boolean interactive;
        private final BiConsumer<String, String> output;
        private final BlockingQueue<String> inputs = new ArrayBlockingQueue<>(64);
        private final AtomicInteger inputBytes = new AtomicInteger(), outputBytes = new AtomicInteger();
        private final StringBuffer stdout = new StringBuffer(), stderr = new StringBuffer();
        private final CompletableFuture<Result> completion = new CompletableFuture<>();
        private volatile boolean cancelled;
        private volatile Process process;
        private volatile String failure;
        private boolean started;
        private Execution(String language, String code, String stdin, String sourceFile, boolean interactive, BiConsumer<String, String> output) {
            this.language = language; this.code = code; this.initialInput = stdin;
            this.sourceFile = sourceFile;
            this.interactive = interactive; this.output = output;
            inputBytes.set(stdin.getBytes(StandardCharsets.UTF_8).length);
        }
        public synchronized CompletableFuture<Result> start() {
            if (!started) { started = true; workers.submit(this::run); }
            return completion;
        }
        public void input(String line) {
            if (line == null || !interactive || cancelled || completion.isDone())
                throw new IllegalArgumentException("No active execution accepts input.");
            String data = line + "\n";
            if (inputBytes.addAndGet(data.getBytes(StandardCharsets.UTF_8).length) > MAX_INPUT || !inputs.offer(data)) {
                failure = "Input limit exceeded."; close(); throw new IllegalArgumentException(failure);
            }
        }
        private void emit(String type, String data) {
            if (outputBytes.addAndGet(data.getBytes(StandardCharsets.UTF_8).length) > MAX_OUTPUT) {
                failure = "Output limit exceeded."; close(); return;
            }
            (type.equals("stdout") ? stdout : stderr).append(data);
            output.accept(type, data);
        }
        private void read(InputStream stream, String type) {
            try (Reader reader = new InputStreamReader(stream, StandardCharsets.UTF_8)) {
                char[] buffer = new char[2048]; int count;
                while ((count = reader.read(buffer)) != -1 && !cancelled) emit(type, new String(buffer, 0, count));
            } catch (IOException ignored) { /* Process termination closes streams. */ }
        }
        private void run() {
            Path directory = null; int exit = -1; boolean createAttempted = false;
            try {
                if (cancelled) return;
                directory = Files.createTempDirectory("nexecute-");
                Path source = directory.resolve(sourceFile);
                Files.writeString(source, code, StandardCharsets.UTF_8);
                if (Files.getFileStore(directory).supportsFileAttributeView("posix")) {
                    Files.setPosixFilePermissions(directory, PosixFilePermissions.fromString("rwxr-xr-x"));
                    Files.setPosixFilePermissions(source, PosixFilePermissions.fromString("rw-r--r--"));
                }
                createAttempted = true;
                docker(createCommand(name, directory, language, sourceFile), 15);
                if (cancelled) return;
                process = new ProcessBuilder("docker", "start", "--attach", "--interactive", name).start();
                if (cancelled) process.destroyForcibly();
                Future<?> out = workers.submit(() -> read(process.getInputStream(), "stdout"));
                Future<?> err = workers.submit(() -> read(process.getErrorStream(), "stderr"));
                Future<?> writer = workers.submit(() -> {
                    try (OutputStream stream = process.getOutputStream()) {
                        stream.write(initialInput.getBytes(StandardCharsets.UTF_8)); stream.flush();
                        while (interactive && !cancelled && process.isAlive()) {
                            String data = inputs.poll(200, TimeUnit.MILLISECONDS);
                            if (data != null) { stream.write(data.getBytes(StandardCharsets.UTF_8)); stream.flush(); }
                        }
                    } catch (IOException ignored) {
                    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                });
                if (!process.waitFor(40, TimeUnit.SECONDS)) { failure = "Execution time limit exceeded."; close(); }
                else exit = process.exitValue();
                writer.cancel(true);
                out.get(3, TimeUnit.SECONDS); err.get(3, TimeUnit.SECONDS);
                if (exit == 124 || exit == 137) failure = "Execution exceeded its time or memory limit.";
            } catch (Exception e) {
                if (!cancelled) failure = "Sandbox unavailable. Check Docker and the sandbox image on the server.";
            } finally {
                if (process != null && process.isAlive()) process.destroyForcibly();
                try { if (createAttempted) docker(List.of("rm", "--force", name), 10); }
                catch (Exception e) { org.slf4j.LoggerFactory.getLogger(DockerExecutionService.class).warn("Could not remove sandbox {}. Check Docker availability.", name); }
                if (directory != null) {
                    try { Files.deleteIfExists(directory.resolve(sourceFile)); Files.deleteIfExists(directory); }
                    catch (IOException e) { org.slf4j.LoggerFactory.getLogger(DockerExecutionService.class).warn("Could not delete {}", directory); }
                }
                if (failure != null) {
                    stderr.append(failure).append('\n');
                    try { output.accept("stderr", failure + "\n"); } catch (RuntimeException ignored) {}
                }
                active.remove(this); slots.release();
                completion.complete(new Result(stdout.toString(), stderr.toString(), exit,
                        exit == 0 && failure == null && !cancelled ? "completed" : "error"));
            }
        }
        @Override public void close() {
            cancelled = true;
            Process current = process;
            if (current != null) current.destroyForcibly();
            // A prepared but unstarted execution must also release its reserved slot.
            start();
        }
    }
    List<String> createCommand(String name, Path source, String language) {
        return createCommand(name, source, language, fileName(language));
    }
    List<String> createCommand(String name, Path source, String language, String file) {
        return List.of("create", "--name", name, "--pull=never", "--label", "nexecute.sandbox=true",
                "--network=none", "--read-only", "--user=10001:10001", "--cap-drop=ALL",
                "--security-opt=no-new-privileges", "--memory=256m", "--memory-swap=256m",
                "--cpus=1", "--pids-limit=64", "--ulimit", "nofile=128:128", "--ulimit", "core=0:0",
                "--log-driver=none", "--interactive", "--init",
                "--mount", "type=bind,source=" + source.toAbsolutePath() + ",target=/source,readonly",
                "--tmpfs", "/work:rw,exec,nosuid,nodev,size=128m,mode=1777",
                "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777", image, language, file);
    }
    private void docker(List<String> arguments, int seconds) throws IOException, InterruptedException {
        List<String> command = new ArrayList<>(); command.add("docker"); command.addAll(arguments);
        Process process = new ProcessBuilder(command).redirectOutput(ProcessBuilder.Redirect.DISCARD)
                .redirectError(ProcessBuilder.Redirect.DISCARD).start();
        try {
            if (!process.waitFor(seconds, TimeUnit.SECONDS) || process.exitValue() != 0)
                throw new IOException("Docker command failed: " + arguments.getFirst());
        } finally { if (process.isAlive()) process.destroyForcibly(); }
    }
    @PreDestroy public void shutdown() {
        active.forEach(Execution::close); workers.shutdown();
        try { if (!workers.awaitTermination(30, TimeUnit.SECONDS)) workers.shutdownNow(); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); workers.shutdownNow(); }
    }
}
