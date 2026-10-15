package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class NotificacoesSteps {

    @Quando("enviar notificação do tipo {string} para o email {string}")
    public void enviarNotificacao(String tipo, String email) {
        Map<String, Object> body = new HashMap<>();
        body.put("tipo", tipo);
        body.put("destinatario_email", email);
        body.put("destinatario_nome", "Usuário Teste");
        body.put("payload", Map.of("pedido_id", "pedido-teste-001"));
        CommonSteps.ultimaResposta = given().contentType("application/json")
                .header("Authorization", "Bearer " + CommonSteps.tokenJwt)
                .body(body)
                .post(Endpoints.NOTIFICACOES + "/v1/notificacoes");
    }
}
