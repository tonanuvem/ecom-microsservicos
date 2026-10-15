package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;
import io.restassured.response.Response;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

/** Steps compartilhados entre todos os serviços */
public class CommonSteps {

    // Estado compartilhado entre steps via campos de instância (Cucumber cria nova instância por cenário)
    protected static Response ultimaResposta;
    protected static String tokenJwt;
    protected static String ultimoId;

    // --- Saúde dos serviços ---

    @Dado("que o serviço de usuários está disponível")
    public void servicoUsuariosDisponivel() {
        // Apenas valida que a URL está configurada; a chamada real ocorre no step de ação
    }

    @Dado("que o serviço de produtos está disponível")
    public void servicoProdutosDisponivel() {}

    @Dado("que o serviço de estoque está disponível")
    public void servicoEstoqueDisponivel() {}

    @Dado("que o serviço de pedidos está disponível")
    public void servicoPedidosDisponivel() {}

    @Dado("que o serviço de pagamentos está disponível")
    public void servicoPagamentosDisponivel() {}

    @Dado("que o serviço de notificações está disponível")
    public void servicoNotificacoesDisponivel() {}

    @Quando("acessar o endpoint de status do serviço de usuários")
    public void statusUsuarios() {
        ultimaResposta = given().get(Endpoints.USUARIOS + "/status");
    }

    @Quando("acessar o endpoint de status do serviço de produtos")
    public void statusProdutos() {
        ultimaResposta = given().get(Endpoints.PRODUTOS + "/status");
    }

    @Quando("acessar o endpoint de status do serviço de estoque")
    public void statusEstoque() {
        ultimaResposta = given().get(Endpoints.ESTOQUE + "/status");
    }

    @Quando("acessar o endpoint de status do serviço de pedidos")
    public void statusPedidos() {
        ultimaResposta = given().get(Endpoints.PEDIDOS + "/status");
    }

    @Quando("acessar o endpoint de status do serviço de pagamentos")
    public void statusPagamentos() {
        ultimaResposta = given().get(Endpoints.PAGAMENTOS + "/status");
    }

    @Quando("acessar o endpoint de status do serviço de notificações")
    public void statusNotificacoes() {
        ultimaResposta = given().get(Endpoints.NOTIFICACOES + "/status");
    }

    // --- Autenticação ---

    @Dado("estou autenticado como administrador")
    public void autenticadoComoAdmin() {
        autenticar("admin@ecom.com", "Admin@123");
    }

    @Dado("estou autenticado como cliente")
    public void autenticadoComoCliente() {
        autenticar("joao@ecom.com", "Senha@123");
    }

    @Dado("estou autenticado como {string}")
    public void autenticadoComoPerfil(String perfil) {
        if ("administrador".equals(perfil)) autenticadoComoAdmin();
        else autenticadoComoCliente();
    }

    private void autenticar(String email, String senha) {
        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("senha", senha);
        Response resp = given().contentType("application/json").body(body)
                .post(Endpoints.USUARIOS + "/v1/auth/login");
        if (resp.statusCode() == 200) {
            tokenJwt = resp.jsonPath().getString("access_token");
        }
    }

    // --- Verificações comuns ---

    @Então("o status de resposta deve ser {int}")
    public void verificarStatus(int statusEsperado) {
        assertNotNull(ultimaResposta, "Nenhuma resposta foi recebida");
        assertEquals(statusEsperado, ultimaResposta.statusCode(),
                "Resposta: " + ultimaResposta.body().asString());
    }

    @Então("a resposta deve conter o campo {string}")
    public void respostaContemCampo(String campo) {
        assertNotNull(ultimaResposta.jsonPath().get(campo),
                "Campo '" + campo + "' não encontrado na resposta: " + ultimaResposta.body().asString());
    }

    @Então("a resposta deve ser uma lista")
    public void respostaEhLista() {
        // ra-data-simple-rest retorna {"data": [...], "total": N}
        assertNotNull(ultimaResposta.jsonPath().get("data"),
                "Resposta não contém campo 'data': " + ultimaResposta.body().asString());
    }
}
