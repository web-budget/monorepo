package br.com.webbudget.server.infrastructure.config

import br.com.webbudget.server.domain.services.financial.DueDateNoticeService
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.ZoneId

@Component
class DueDateNoticeScheduler(
    private val dueDateNoticeService: DueDateNoticeService,
    @Value($$"${web-budget.mail.time-zone}")
    timeZone: String
) {

    private val zone = ZoneId.of(timeZone)

    @Scheduled(
        cron = $$"${web-budget.due-date-notices.daily-cron}",
        zone = $$"${web-budget.mail.time-zone}"
    )
    fun sendDaily() {
        dueDateNoticeService.sendDaily(LocalDate.now(zone))
    }

    @Scheduled(
        cron = $$"${web-budget.due-date-notices.weekly-cron}",
        zone = $$"${web-budget.mail.time-zone}"
    )
    fun sendWeekly() {
        dueDateNoticeService.sendWeekly(LocalDate.now(zone))
    }
}
