package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class PagamentosSteps {

    @Quando("iniciar sessão de pagamento para o pedido {string}")
    public void iniciarSessaoPagamento(String pedidoId) {
        Map<String, String> body = new HashMap<>();
        body.put("pedido_id", pedidoId);
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .body(body)
                .post(Endpoints.PAGAMENTOS + "/v1/pagamentos/sessao");
    }

    @Quando("receber webhook de pagamento aprovado com chave {string} para o pedido {string}")
    public void webhookAprovado(String chave, String pedidoId) {
        Map<String, String> body = new HashMap<>();
        body.put("idempotency_key", chave);
        body.put("pedido_id", pedidoId);
        body.put("status", "APROVADO");
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .body(body)
                .post(Endpoints.PAGAMENTOS + "/v1/pagamentos/webhook");
    }

    @Quando("receber webhook com status {string} para o pedido {string}")
    public void webhookComStatus(String status, String pedidoId) {
        Map<String, String> body = new HashMap<>();
        body.put("idempotency_key", "idem-" + pedidoId);
        body.put("pedido_id", pedidoId);
        body.put("status", status);
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .body(body)
                .post(Endpoints.PAGAMENTOS + "/v1/pagamentos/webhook");
    }
}
