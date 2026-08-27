from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = 'chave_secreta_para_sessoes'

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    senha = request.form.get('senha')
    
    # Exemplo simples de validação
    if email == "admin@isabela.com" and senha == "123456":
        return f"Bem-vinda, Isabela! Login realizado com sucesso."
    else:
        return "E-mail ou senha incorretos.", 401

if __name__ == '__main__':
    app.run(debug=True)