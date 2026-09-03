import os
from flask import Flask, request, redirect, url_for, render_template, flash, session
from dotenv import load_dotenv
from supabase import create_client, Client

# --- 1. Configuração do Supabase ---
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Configure SUPABASE_URL e SUPABASE_KEY no arquivo .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

            # O perfil é opcional para autenticar. A tabela USUARIOS possui
            # RLS e pode ser preenchida depois por uma operação administrativa.
            session["user_id"] = usuario_id
            return redirect(url_for("feed"))
                
        except Exception as e:
            app.logger.exception("Falha ao autenticar usuário")
            mensagem = str(e).lower()
            if "email not confirmed" in mensagem:
                flash("Confirme seu email no Supabase antes de entrar.")
            else:
                flash("Email ou senha incorretos.")
            return render_template("login.html"), 401

    # Quando acessado via GET, mostra a página
    return render_template("login.html")


# --- 3. Telas após o Login ---

@app.route("/gerenciamento")
def gerenciamento():
    # Proteção: se não tiver logado, manda pro login de volta
    if "user_id" not in session:
        return redirect(url_for("login"))
        
    return "<h1>Área de Consultoria / Gerenciamento </h1><a href='/logout'>Sair</a>"

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
    email = request.form.get("email", "").strip()
    senha = request.form.get("senha", "")

    if not email or not senha:
        flash("Preencha email e senha.")
        return redirect(url_for("gerenciamento"))

    try:
        supabase.auth.admin.create_user({
            "email": email,
            "password": senha,
            "email_confirm": True
        })
        flash("Cliente cadstrado com sucesso!")
    except Exception as e:
        app.logger.exception("Erro ao cadastrar cliente")
        flash("Erro ao cadastrar. Verifique os dados inseridos.")

    return redirect(url_for("gerenciamento"))



if __name__ == "__main__":
    app.run(debug=True)