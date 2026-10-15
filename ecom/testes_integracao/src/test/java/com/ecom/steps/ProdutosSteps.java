package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class ProdutosSteps {

    @Quando("listar os produtos sem autenticação")
    public void listarProdutos() {
        CommonSteps.ultimaResposta = given().get(Endpoints.PRODUTOS + "/v1/produtos");
    }

    @Quando("criar um produto com nome {string} e preço {double}")
    public void criarProduto(String nome, double preco) {
        Map<String, Object> body = new HashMap<>();
        body.put("nome", nome);
        body.put("preco", preco);
        body.put("descricao", "Produto de teste");
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .body(body)
                .post(Endpoints.PRODUTOS + "/v1/produtos");
        if (CommonSteps.ultimaResposta.statusCode() == 201) {
            CommonSteps.ultimoId = CommonSteps.ultimaResposta.jsonPath().getString("id");
        }
    }

    @Quando("buscar o produto com id {string}")
    public void buscarProdutoPorId(String id) {
        CommonSteps.ultimaResposta = given().get(Endpoints.PRODUTOS + "/v1/produtos/" + id);
    }
}
