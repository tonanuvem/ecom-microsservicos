package com.ecom.config;

/** Centraliza as URLs base de cada microsserviço, lidas de variáveis de ambiente.
 *  Padrão: SERVICE_URL=http://host:porta  (sem barra final)
 */
public class Endpoints {
    public static final String USUARIOS  = System.getenv().getOrDefault("USUARIOS_URL",  "http://localhost:8001");
    public static final String PRODUTOS  = System.getenv().getOrDefault("PRODUTOS_URL",  "http://localhost:8002");
    public static final String ESTOQUE   = System.getenv().getOrDefault("ESTOQUE_URL",   "http://localhost:8003");
    public static final String PEDIDOS   = System.getenv().getOrDefault("PEDIDOS_URL",   "http://localhost:8004");
    public static final String PAGAMENTOS= System.getenv().getOrDefault("PAGAMENTOS_URL","http://localhost:8005");
    public static final String NOTIFICACOES=System.getenv().getOrDefault("NOTIFICACOES_URL","http://localhost:8006");
}
