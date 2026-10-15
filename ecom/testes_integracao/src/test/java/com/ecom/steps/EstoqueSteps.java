package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class EstoqueSteps {

    @Quando("verificar disponibilidade do produto {string}")
    public void verificarDisponibilidade(String produtoId) {
        CommonSteps.ultimaResposta = given()
                .queryParam("produto_ids", produtoId)
                .get(Endpoints.ESTOQUE + "/v1/estoque/disponibilidade");
    }

    @Quando("reservar {int} unidade do produto {string} para o pedido {string}")
    public void reservarEstoque(int quantidade, String produtoId, String pedidoId) {
        Map<String, Object> body = new HashMap<>();
        body.put("pedido_id", pedidoId);
        body.put("produto_id", produtoId);
        body.put("quantidade", quantidade);
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .body(body)
                .post(Endpoints.ESTOQUE + "/v1/estoque/reservas");
    }

    @Quando("atualizar a quantidade do produto {string} para {int}")
    public void atualizarQuantidade(String produtoId, int quantidade) {
        Map<String, Object> body = new HashMap<>();
        body.put("quantidade", quantidade);
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .body(body)
                .put(Endpoints.ESTOQUE + "/v1/estoque/" + produtoId);
    }
}
