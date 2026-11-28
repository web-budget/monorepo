package br.com.webbudget.server.application.payloads

import tools.jackson.core.JsonParser
import tools.jackson.databind.DeserializationContext
import tools.jackson.databind.deser.std.StdDeserializer

class UntrimmedStringDeserializer : StdDeserializer<String>(String::class.java) {

    override fun deserialize(parser: JsonParser, context: DeserializationContext): String? =
        parser.string.ifEmpty { null }
}
