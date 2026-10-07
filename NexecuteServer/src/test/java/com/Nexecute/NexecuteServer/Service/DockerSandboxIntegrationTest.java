package com.Nexecute.NexecuteServer.Service;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "NEXECUTE_DOCKER_TESTS", matches = "true")
class DockerSandboxIntegrationTest {
    private DockerExecutionService service;
    @BeforeEach void setup() { service = new DockerExecutionService("nexecute-sandbox:local"); }
    @AfterEach void teardown() { service.shutdown(); }
    private DockerExecutionService.Result run(String language, String code, String stdin) throws Exception {
        try (var execution = service.prepare(language, code, stdin, false, (t,d) -> {})) {
            return execution.start().get(60, TimeUnit.SECONDS);
        }
    }
    @Test void runsEveryUiLanguageAndClosesBatchStdin() throws Exception {
        String[][] examples = {
            {"python", "import sys; print(sys.stdin.read().strip())"},
            {"javascript", "console.log(require('fs').readFileSync(0,'utf8').trim())"},
            {"java", "class Solution { public static void main(String[] a) { System.out.println(new java.util.Scanner(System.in).nextLine()); } }"},
            {"cpp", "#include <iostream>\n#include <string>\nint main(){std::string s;std::getline(std::cin,s);std::cout<<s<<std::endl;}"}
        };
        for (var example : examples) {
            var result = run(example[0], example[1], "Hello\n");
            assertEquals("completed", result.status(), example[0] + ": " + result.stderr());
            assertEquals("Hello\n", result.stdout());
        }
    }
    @Test void streamsPromptsAndAcceptsBlankLines() throws Exception {
        var prompt = new CountDownLatch(1);
        try (var execution = service.prepare("python", "x=input('Name: '); y=input('Again: '); print(repr(x),repr(y))", "", true,
                (type, data) -> { if (data.contains("Name:")) prompt.countDown(); })) {
            var result = execution.start();
            assertTrue(prompt.await(20, TimeUnit.SECONDS));
            execution.input("Ada"); execution.input("");
            var completed = result.get(40, TimeUnit.SECONDS);
            assertEquals("completed", completed.status(), completed.stderr());
            assertTrue(completed.stdout().contains("'Ada' ''"));
        }
    }
    @Test void javaScannerWaitsForInteractiveNumber() throws Exception {
        String code = "import java.util.Scanner; class Solution { public static void main(String[] args) { Scanner kb=new Scanner(System.in); int a=kb.nextInt(); System.out.println(\"Number is: \"+a); } }";
        try (var execution = service.prepare("java", code, "", true, (type, data) -> {})) {
            var future = execution.start();
            // No initial stdin and no printed prompt: the same process must stay alive.
            assertThrows(TimeoutException.class, () -> future.get(3, TimeUnit.SECONDS));
            execution.input("42");
            var result = future.get(40, TimeUnit.SECONDS);
            assertEquals("completed", result.status(), result.stderr());
            assertEquals("Number is: 42\n", result.stdout());
        }
        var batch = run("java", code, "42\n");
        assertEquals("completed", batch.status(), batch.stderr());
        assertEquals("Number is: 42\n", batch.stdout());
    }
    @Test void executesFrontendFilenamesAcrossLanguages() throws Exception {
        String[][] examples = {
            {"java", "Main.java", "public class Main { public static void main(String[] args) { System.out.println(\"custom\"); } }"},
            {"python", "my_script.py", "print('custom')"},
            {"javascript", "my-script.js", "console.log('custom')"},
            {"cpp", "custom.cpp", "#include <iostream>\nint main(){std::cout<<\"custom\\n\";}"}
        };
        for (var example : examples) {
            try (var execution = service.prepare(example[0], example[2], "", example[1], false, (t,d) -> {})) {
                var result = execution.start().get(60, TimeUnit.SECONDS);
                assertEquals("completed", result.status(), example[1] + ": " + result.stderr());
                assertEquals("custom\n", result.stdout());
            }
        }
        try (var execution = service.prepare("java", "class Numbers { public static void main(String[] a) { System.out.println(new java.util.Scanner(System.in).nextInt()); } }", "", "Numbers.java", true, (t,d) -> {})) {
            var future = execution.start();
            execution.input("42");
            var result = future.get(60, TimeUnit.SECONDS);
            assertEquals("completed", result.status(), result.stderr());
            assertEquals("42\n", result.stdout());
        }
    }
    @Test void newLanguagesSupportBatchAndInteractiveInput() throws Exception {
        String[][] examples = {
            {"c", "custom.c", "#include <stdio.h>\nint main(void){int n; if(scanf(\"%d\",&n)!=1)return 1; printf(\"Number: %d\\n\",n);}"},
            {"go", "custom.go", "package main\nimport \"fmt\"\nfunc main(){var n int; fmt.Scan(&n); fmt.Printf(\"Number: %d\\n\",n)}"},
            {"rust", "my-program.rs", "use std::io; fn main(){let mut s=String::new(); io::stdin().read_line(&mut s).unwrap(); println!(\"Number: {}\",s.trim());}"},
            {"ruby", "custom.rb", "puts \"Number: #{STDIN.gets.strip}\""},
            {"php", "custom.php", "<?php echo 'Number: '.trim(fgets(STDIN)).\"\\n\";"}
        };
        for (var example : examples) {
            checkInputModes(example);
        }
    }
    @Test void typescriptSupportsBatchAndInteractiveInput() throws Exception {
        checkInputModes(new String[]{"typescript", "custom.ts", "declare function require(name: string): any; const readline = require('readline'); const rl = readline.createInterface({input: require('process').stdin}); rl.once('line', (line: string) => { console.log('Number: ' + line); rl.close(); require('process').stdin.destroy(); });"});
    }
    private void checkInputModes(String[] example) throws Exception {
            for (boolean interactive : new boolean[]{false, true}) {
                try (var execution = service.prepare(example[0], example[2], interactive ? "" : "42\n", example[1], interactive, (t,d) -> {})) {
                    var future = execution.start();
                    if (interactive) execution.input("42");
                    var result = future.get(60, TimeUnit.SECONDS);
                    assertEquals("completed", result.status(), example[0] + " interactive=" + interactive + ": " + result.stderr() + " stdout=" + result.stdout());
                    assertEquals("Number: 42\n", result.stdout(), example[0]);
                }
            }
    }
    @Test void rejectsNetworkRootWritesAndPrivilegedUser() throws Exception {
        var result = run("python", "import os,socket\nassert os.getuid()==10001\ntry:\n open('/blocked','w')\n raise AssertionError('root writable')\nexcept PermissionError: pass\nexcept OSError: pass\ns=socket.socket();s.settimeout(1)\ntry:\n s.connect(('1.1.1.1',80))\n raise AssertionError('network available')\nexcept OSError: pass\nprint('isolated')", "");
        assertEquals("completed", result.status(), result.stderr());
        assertEquals("isolated\n", result.stdout());
    }
    @Test void boundsOutputAndReportsCompilerFailures() throws Exception {
        var flood = run("python", "while True: print('x'*4096)", "");
        assertEquals("error", flood.status());
        assertTrue(flood.stdout().length() <= DockerExecutionService.MAX_OUTPUT);
        assertTrue(flood.stderr().contains("Output limit"));
        assertEquals("error", run("cpp", "not valid c++", "").status());
    }
    @Test void enforcesDeadlineAndCancellation() throws Exception {
        assertEquals("error", run("python", "while True: pass", "").status());
        var ready = new CountDownLatch(1);
        var execution = service.prepare("python", "print('ready'); input()", "", true, (t,d) -> ready.countDown());
        var future = execution.start();
        assertTrue(ready.await(20, TimeUnit.SECONDS));
        execution.close();
        assertEquals("error", future.get(20, TimeUnit.SECONDS).status());
    }
}
