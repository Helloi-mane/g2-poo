import crypto from "node:crypto";
import { usuario, produto } from "./relatorio";
// =========================
// Chat
// =========================

class mensagem {
    id_mensagem: string;
    autor: usuario;
    texto: string;
    enviada_em: number;
    lida: boolean;

    constructor(autor: usuario, texto: string) {
        this.id_mensagem = crypto.randomUUID();
        this.autor = autor;
        this.texto = texto;
        this.enviada_em = Date.now();
        this.lida = false;
    }
}

class conversa {
    id_conversa: string;
    usuario1: usuario;
    usuario2: usuario;
    produto?: produto;      // contexto opcional da conversa
    mensagens: mensagem[];

    constructor(usuario1: usuario, usuario2: usuario, produto?: produto) {
        this.id_conversa = crypto.randomUUID();
        this.usuario1 = usuario1;
        this.usuario2 = usuario2;
        this.produto = produto;
        this.mensagens = [];
    }

    participa(u: usuario): boolean {
        return u.id_user === this.usuario1.id_user || u.id_user === this.usuario2.id_user;
    }

    enviar(autor: usuario, texto: string): void {
        if (!this.participa(autor)) return;
        if (texto.trim() === "") return;
        this.mensagens.push(new mensagem(autor, texto));
    }

    // Marca como lidas as mensagens que o OUTRO usuário mandou
    marcar_como_lidas(leitor: usuario): void {
        for (const m of this.mensagens) {
            if (m.autor.id_user !== leitor.id_user) m.lida = true;
        }
    }

    nao_lidas(leitor: usuario): number {
        return this.mensagens.filter(
            m => !m.lida && m.autor.id_user !== leitor.id_user
        ).length;
    }

    // Só quem participa pode ler
    ler(leitor: usuario): mensagem[] {
        if (!this.participa(leitor)) return [];
        this.marcar_como_lidas(leitor);
        return this.mensagens;
    }
}

class chat {
    conversas: conversa[] = [];

    // Reaproveita a conversa se já existir entre os dois (sobre o mesmo produto)
    abrir_conversa(u1: usuario, u2: usuario, produto?: produto): conversa | undefined {
        if (u1.id_user === u2.id_user) return undefined; // não conversa consigo mesmo

        const existente = this.conversas.find(c =>
            c.participa(u1) && c.participa(u2) &&
            c.produto?.id_produto === produto?.id_produto
        );
        if (existente) return existente;

        const nova = new conversa(u1, u2, produto);
        this.conversas.push(nova);
        return nova;
    }

    conversas_do_usuario(u: usuario): conversa[] {
        return this.conversas.filter(c => c.participa(u));
    }

    exibir(c: conversa, leitor: usuario): void {
        console.log(`\n--- Conversa${c.produto ? " sobre " + c.produto.nome : ""} ---`);
        for (const m of c.ler(leitor)) {
            const hora = new Date(m.enviada_em).toLocaleTimeString("pt-BR");
            console.log(`[${hora}] ${m.autor.nome}: ${m.texto}`);
        }
    }
}