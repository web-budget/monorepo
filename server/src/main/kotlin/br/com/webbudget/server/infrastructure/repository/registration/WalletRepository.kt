package br.com.webbudget.server.infrastructure.repository.registration

import br.com.webbudget.server.domain.entities.registration.Wallet
import br.com.webbudget.server.infrastructure.repository.concurrentUpdate
import br.com.webbudget.server.infrastructure.repository.excluding
import br.com.webbudget.server.infrastructure.repository.pagedModelOf
import br.com.webbudget.server.infrastructure.repository.toOrderBy
import br.com.webbudget.server.jooq.financial.tables.references.WALLET_ENTRIES
import br.com.webbudget.server.jooq.registration.tables.references.WALLETS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

@Repository
class WalletRepository(
    private val dsl: DSLContext
) {

    fun findByExternalId(externalId: UUID): Wallet? {
        val wallets = WALLETS.`as`("wallets")
        return dsl.selectFrom(wallets)
            .where(wallets.EXTERNAL_ID.eq(externalId))
            .fetchOne { record -> record.toWallet() }
            ?.also { wallet -> wallet.lastEntryOn = findLastEntryOn(wallet.id) }
    }

    private fun findLastEntryOn(walletId: Long?): LocalDateTime? = dsl
        .select(DSL.max(WALLET_ENTRIES.CREATED_ON))
        .from(WALLET_ENTRIES)
        .where(WALLET_ENTRIES.ID_WALLET.eq(walletId))
        .fetchSingle()
        .value1()

    fun findAll(filter: String?, active: Boolean?, pageable: Pageable): PagedModel<Wallet> {

        val wallets = WALLETS.`as`("wallets")

        val textCondition = filter?.let { text ->
            DSL.or(
                wallets.NAME.containsIgnoreCase(text),
                wallets.BANK.containsIgnoreCase(text),
                wallets.AGENCY.containsIgnoreCase(text),
                wallets.NUMBER.containsIgnoreCase(text)
            )
        }

        val condition = DSL.and(listOfNotNull(active?.let { wallets.ACTIVE.eq(it) }, textCondition))

        val sortable = mapOf(
            "name" to wallets.NAME,
            "type" to wallets.TYPE,
            "currentBalance" to wallets.CURRENT_BALANCE,
            "active" to wallets.ACTIVE,
            "description" to wallets.DESCRIPTION,
            "bank" to wallets.BANK,
            "agency" to wallets.AGENCY,
            "number" to wallets.NUMBER,
            "createdOn" to wallets.CREATED_ON
        )

        val content = dsl.selectFrom(wallets)
            .where(condition)
            .orderBy(pageable.toOrderBy(sortable, wallets.CREATED_ON, wallets.ID))
            .limit(pageable.pageSize)
            .offset(pageable.offset)
            .fetch { record -> record.toWallet() }

        val total = dsl.fetchCount(wallets, condition)

        return pagedModelOf(content, pageable, total.toLong())
    }

    fun existsByName(name: String, excludingExternalId: UUID? = null): Boolean = dsl.fetchExists(
        dsl.selectOne().from(WALLETS)
            .where(WALLETS.NAME.equalIgnoreCase(name))
            .and(WALLETS.EXTERNAL_ID.excluding(excludingExternalId))
    )

    fun existsByBankInfo(bank: String?, agency: String?, number: String?, excludingExternalId: UUID? = null): Boolean =
        dsl.fetchExists(
            dsl.selectOne().from(WALLETS)
                .where(WALLETS.BANK.eq(bank))
                .and(WALLETS.AGENCY.eq(agency))
                .and(WALLETS.NUMBER.eq(number))
                .and(WALLETS.EXTERNAL_ID.excluding(excludingExternalId))
        )

    fun insert(wallet: Wallet): Wallet {
        val record = dsl.insertInto(WALLETS)
            .set(WALLETS.EXTERNAL_ID, UUID.randomUUID())
            .set(WALLETS.VERSION, 0)
            .set(WALLETS.CREATED_ON, LocalDateTime.now())
            .set(WALLETS.NAME, wallet.name)
            .set(WALLETS.TYPE, wallet.type.name)
            .set(WALLETS.CURRENT_BALANCE, wallet.currentBalance)
            .set(WALLETS.ACTIVE, wallet.active)
            .set(WALLETS.DESCRIPTION, wallet.description)
            .set(WALLETS.BANK, wallet.bank)
            .set(WALLETS.AGENCY, wallet.agency)
            .set(WALLETS.NUMBER, wallet.number)
            .returning()
            .fetchSingle()

        wallet.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return wallet
    }

    fun update(wallet: Wallet): Wallet {
        val record = dsl.update(WALLETS)
            .set(WALLETS.NAME, wallet.name)
            .set(WALLETS.TYPE, wallet.type.name)
            .set(WALLETS.ACTIVE, wallet.active)
            .set(WALLETS.DESCRIPTION, wallet.description)
            .set(WALLETS.BANK, wallet.bank)
            .set(WALLETS.AGENCY, wallet.agency)
            .set(WALLETS.NUMBER, wallet.number)
            .set(WALLETS.VERSION, WALLETS.VERSION.plus(1))
            .set(WALLETS.LAST_UPDATE, LocalDateTime.now())
            .where(WALLETS.ID.eq(wallet.id))
            .and(WALLETS.VERSION.eq(wallet.version))
            .returning()
            .fetchOne() ?: throw concurrentUpdate()

        wallet.restore(record.id, record.externalId, record.version, record.createdOn, record.lastUpdate)
        return wallet
    }

    fun delete(wallet: Wallet) {
        dsl.deleteFrom(WALLETS)
            .where(WALLETS.ID.eq(wallet.id))
            .execute()
    }
}
