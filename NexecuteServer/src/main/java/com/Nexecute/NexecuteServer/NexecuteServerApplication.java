package com.Nexecute.NexecuteServer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class NexecuteServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(NexecuteServerApplication.class, args);
	}

}
