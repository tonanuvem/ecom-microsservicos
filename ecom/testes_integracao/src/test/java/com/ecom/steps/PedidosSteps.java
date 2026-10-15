package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class PedidosSteps {

    @Quando("criar um pedido com o produto {string} quantidade {int}")
    public void criarPedido(String produtoId, int quantidade) {
        Map<String, Object> item = new HashMap<>();
        item.put("produto_id", produtoId);
        item.put("quantidade", quantidade);
        item.put("preco_unit", 99.90);
        item.put("nome_produto", "Produto Teste");

        Map<String, Object> body = new HashMap<>();
        body.put("itens", List.of(item));

        CommonSteps.ultimaResposta = given().contentType("application/json")
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .body(body)
                .post(Endpoints.PEDIDOS + "/v1/pedidos");
        if (CommonSteps.ultimaResposta.statusCode() == 201) {
            CommonSteps.ultimoId = CommonSteps.ultimaResposta.jsonPath().getString("id");
        }
    }

    @Quando("criar um pedido sem autenticação")
    public void criarPedidoSemAuth() {
        Map<String, Object> body = new HashMap<>();
        body.put("itens", List.of());
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .body(body)
                .post(Endpoints.PEDIDOS + "/v1/pedidos");
    }

    @Quando("buscar o pedido com id {string}")
    public void buscarPedidoPorId(String id) {
        CommonSteps.ultimaResposta = given()
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .get(Endpoints.PEDIDOS + "/v1/pedidos/" + id);
    }

    @Quando("listar meus pedidos")
    public void listarMeusPedidos() {
        CommonSteps.ultimaResposta = given()
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .get(Endpoints.PEDIDOS + "/v1/pedidos");
    }
}
