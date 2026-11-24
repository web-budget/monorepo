package br.com.webbudget.server.infrastructure.config

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling

@EnableScheduling
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = ["web-budget.scheduling.enabled"], havingValue = "true", matchIfMissing = true)
class SchedulingConfiguration
