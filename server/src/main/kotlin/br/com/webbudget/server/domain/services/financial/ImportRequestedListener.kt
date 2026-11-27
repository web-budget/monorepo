package br.com.webbudget.server.domain.services.financial

import br.com.webbudget.server.domain.exceptions.ErrorCodes.IMPORT_PROCESSING_FAILED
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

private val logger = KotlinLogging.logger {}

@Component
class ImportRequestedListener(
    private val importProcessingService: ImportProcessingService
) {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onImportRequested(event: ImportRequested) {

        try {
            importProcessingService.process(event.importId, event.content)
        } catch (exception: Exception) {
            logger.error(exception) { "Could not process the import ${event.importId}" }
            importProcessingService.fail(event.importId, IMPORT_PROCESSING_FAILED)
        }
    }
}
