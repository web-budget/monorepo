package br.com.webbudget.server.infrastructure.repository

import org.jooq.Field
import org.jooq.OrderField
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedModel

private const val NAME_PROPERTY = "name"

fun <T : Any> pagedModelOf(content: List<T>, pageable: Pageable, total: Long): PagedModel<T> =
    PagedModel(PageImpl(content, pageable, total))

fun <T : Any, R : Any> PagedModel<T>.map(transform: (T) -> R): PagedModel<R> {
    val metadata = requireNotNull(metadata)
    val pageable = PageRequest.of(metadata.number.toInt(), metadata.size.toInt())
    return PagedModel(PageImpl(content.map(transform), pageable, metadata.totalElements))
}

fun Pageable.toOrderBy(sortable: Map<String, Field<*>>, createdOn: Field<*>, id: Field<*>): List<OrderField<*>> {
    val requested: List<OrderField<*>> = sort.mapNotNull { order ->
        sortable[order.property]?.let { field ->
            val sortKey = if (order.property == NAME_PROPERTY) field.withoutAccentsAndCase() else field
            if (order.isAscending) sortKey.asc() else sortKey.desc()
        }
    }
    return requested.ifEmpty { listOf(createdOn.desc()) } + id.desc()
}
