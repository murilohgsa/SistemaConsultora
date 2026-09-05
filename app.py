import os
from flask import Flask, request, redirect, url_for, render_template, flash, session
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. Configuração do Supabase ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Configure SUPABASE_URL e SUPABASE_KEY no arquivo .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# --- 2. Configuração do Flask ---
app = Flask(__name__)
app.secret_key = "chave_secreta_super_segura_aqui"  # Necessário para as mensagens flash e sessão

# Rota inicial redireciona para a tela de login
@app.route("/")
def index():
    return redirect(url_for("login"))

# Rota de Login (Repare que o nome é /login, igual ao action do seu form)
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        # Pega os dados do seu form HTML
        email = request.form.get("email", "").strip()
        senha = request.form.get("senha", "")

        if not email or not senha:
            flash("Informe email e senha.")
            return render_template("login.html"), 400

        
        try:
            # 1. Autentica no Supabase
            resposta_auth = supabase.auth.sign_in_with_password({
                "email": email, 
                "password": senha
            })
            usuario_id = resposta_auth.user.id

            resposta_banco = (supabase.table("usuario")
                              .select("id_usuario, email, nome, is_consultora")
                              .eq("email", email)
                              .execute())

            if not resposta_banco.data:
                flash("Usuário não tem perfil configurado no banco.")
                return render_template("login.html"), 403

            dados_usuario = resposta_banco.data[0]
            is_consultora = dados_usuario.get("is_consultora", False)

            session["user_id"] = usuario_id
            if is_consultora:
                return redirect(url_for("gerenciamento"))
            return redirect(url_for("feed"))
                
        except Exception as e:
            app.logger.exception("Falha ao autenticar usuário")
            mensagem = str(e).lower()
            if "email not confirmed" in mensagem:
                flash("Confirme seu email no Supabase antes de entrar.")
            else:
                flash("Email ou senha incorretos.")
            return render_template("login.html"), 401

    return render_template("login.html")


# --- 3. Telas após o Login ---

@app.route("/gerenciamento")
def gerenciamento():
    # Proteção: se não tiver logado, manda pro login de volta
    if "user_id" not in session:
        return redirect(url_for("login"))
        
    return render_template("gerenciamento.html")

@app.route("/feed")
def feed():
    # Proteção: se não tiver logado, manda pro login de volta
    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("feed.html")

@app.route("/logout")
def logout():
    # Limpa a sessão e sai do Supabase
    session.pop("user_id", None)
    supabase.auth.sign_out()
    return redirect(url_for("login"))

# cadastro do cliente

@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    if "user_id" not in session:
        return redirect(url_for("login"))
    nome = request.form.get("nome", "").strip()
    email = request.form.get("email", "").strip()
    senha = request.form.get("senha", "")
    is_consultora = request.form.get("is_consultora") == "true"

    if not email or not senha or not nome:
        flash("Preencha todos os campos.")
        return redirect(url_for("gerenciamento"))

    try:
        resposta = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": senha,
            "email_confirm": True
        })

        usuario_id = resposta.user.id

        supabase_admin.table("usuario").insert({
            "auth_user_id":usuario_id,
            "email":email,
            "nome": nome,
            "is_consultora": is_consultora
        }).execute()

        flash("Cliente cadstrado com sucesso!")
    except Exception as e:
        app.logger.exception("Erro ao cadastrar cliente")
        flash("Erro ao cadastrar. Verifique os dados inseridos.")

    return redirect(url_for("gerenciamento"))



if __name__ == "__main__":
    app.run(debug=True)