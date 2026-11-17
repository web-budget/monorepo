package br.com.webbudget.server.infrastructure.config

import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.scheduling.annotation.EnableAsync

@EnableAsync
@Configuration(proxyBeanMethods = false)
@Profile("!test")
class AsyncConfiguration
