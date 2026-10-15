package com.ecom.steps;

import com.ecom.config.Endpoints;
import io.cucumber.java.pt.*;
import io.restassured.response.Response;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;

public class UsuariosSteps {

    // Email pré-cadastrado no passo "Dado"; se preenchido, o Quando usa ele diretamente
    static String emailPreCadastrado = null;

    @Quando("cadastrar um usuário com nome {string}, email {string} e senha {string}")
    public void cadastrarUsuario(String nome, String email, String senha) {
        // Se o email foi pré-cadastrado no Dado, usa o mesmo (cenário de duplicidade)
        // Caso contrário, adiciona timestamp para garantir unicidade entre execuções
        String emailFinal = (emailPreCadastrado != null && emailPreCadastrado.equals(email))
                ? email
                : email.replace("@", "_" + System.currentTimeMillis() + "@");
        emailPreCadastrado = null; // reset após uso
        Map<String, String> body = new HashMap<>();
        body.put("nome", nome);
        body.put("email", emailFinal);
        body.put("senha", senha);
        CommonSteps.ultimaResposta = given().contentType("application/json").body(body)
                .post(Endpoints.USUARIOS + "/v1/usuarios");
    }

    @Dado("o email {string} já está cadastrado")
    public void emailJaCadastrado(String email) {
        // Garante que o usuário existe; ignora erro se já existir
        Map<String, String> body = new HashMap<>();
        body.put("nome", "Usuário Existente");
        body.put("email", email);
        body.put("senha", "Senha@123");
        given().contentType("application/json").body(body)
                .post(Endpoints.USUARIOS + "/v1/usuarios");
        // Sinaliza que o próximo Quando deve usar este email sem modificação
        emailPreCadastrado = email;
    }

    @Quando("realizar login com email {string} e senha {string}")
    public void realizarLogin(String email, String senha) {
        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("senha", senha);
        CommonSteps.ultimaResposta = given().contentType("application/json").body(body)
                .post(Endpoints.USUARIOS + "/v1/auth/login");
    }
}
