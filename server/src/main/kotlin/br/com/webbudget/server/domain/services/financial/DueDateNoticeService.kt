package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.infrastructure.repository.administration.UserRepository
import br.com.webbudget.server.infrastructure.repository.financial.MovementRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

@Service
@Transactional(readOnly = true)
class DueDateNoticeService(
    private val userRepository: UserRepository,
    private val movementRepository: MovementRepository,
    private val dueDateNoticeNotifier: DueDateNoticeNotifier
) {

    fun sendDaily(today: LocalDate): Int {

        val movements = movementRepository.findOpenDueBetween(today, today)

        if (movements.isEmpty()) {
            return 0
        }

        val recipients = userRepository.findDueDateNoticeRecipients()

        recipients.forEach { dueDateNoticeNotifier.notifyDaily(it, movements) }

        return recipients.size
    }

    fun sendWeekly(today: LocalDate): Int {

        val from = today.with(TemporalAdjusters.next(DayOfWeek.MONDAY))
        val to = from.plusDays(DAYS_IN_WEEK - 1)

        val movements = movementRepository.findOpenDueBetween(from, to)

        if (movements.isEmpty()) {
            return 0
        }

        val recipients = userRepository.findDueDateNoticeRecipients()

        recipients.forEach { dueDateNoticeNotifier.notifyWeekly(it, movements, from, to) }

        return recipients.size
    }

    companion object {
        private const val DAYS_IN_WEEK = 7L
    }
}
