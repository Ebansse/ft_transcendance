package com.transcendance.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.transcendance.backend.dto.HelloResponse;

@RestController
@CrossOrigin(origins = "*")
public class HelloController {

	@GetMapping("/hello")
	public HelloResponse hello() {
		return new HelloResponse("HELOOO WOORLDD");
	}

}
