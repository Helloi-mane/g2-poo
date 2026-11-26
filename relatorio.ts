const cinco_dias_ms = 5 * 24 * 60 * 60 * 1000;

import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// =========================
// Interfaces dos repositórios
// =========================

interface horariodata {
    horas: number;
    minutos: number;
}

interface usuariodata {
    id_user: string;
    nome: string;
    numero_telefone: string;
    numero_de_compras: number;
    numero_de_vendas: number;
    id_transacoes_cliente: string[];
    id_transacoes_vendedor: string[];
    id_historico_transacoes: string[];
}

interface produtodata {
    id_produto: string;
    nome: string;
    preco: number;
    vendedor: string;
    quantidade: number;
    horario_inicio: horariodata;
    horario_final: horariodata;
    tipo_produto: string;
    tipo?: string;
}

interface transacaodata {
    id_transaction: string;
    id_pedido: string;
    id_vendedor: string;
    id_comprador: string;
    quantidade: number;
    id_produto: string;
    confirmacao_comprador: boolean;
    confirmacao_vendedor: boolean;
    expira_em: number;
    data_criacao: number;
    data_finalizacao?: number;
    status: "pendente" | "concluida" | "cancelada";
}

interface MercadoData {
    usuarios: usuariodata[];
    produtos: produtodata[];
    transacoes: transacaodata[];
}

interface mercado {
    usuarios: usuario[];
    produtos: produto[];
}

// =========================
// Repositórios JSON
// =========================

class jsonUsuarioRepositorio {
    constructor(private readonly arquivo: string) {}

    existe(): boolean {
        return existsSync(this.arquivo);
    }

    salvar(m: mercado): void {
        const dados: usuariodata[] = m.usuarios.map(u => ({
            id_user: u.id_user,
            nome: u.nome,
            numero_telefone: u.numero_telefone,
            numero_de_compras: u.numero_de_compras,
            numero_de_vendas: u.numero_de_vendas,
            id_transacoes_cliente: u.transacoes_cliente.map(x => x.id_transaction),
            id_transacoes_vendedor: u.transacoes_vendedor.map(x => x.id_transaction),
            id_historico_transacoes: u.historico_transacoes.map(x => x.id_transaction)
        }));

        writeFileSync(this.arquivo, JSON.stringify(dados, null, 2), "utf-8");
    }

    carregar(): usuariodata[] {
        if (!this.existe()) return [];
        return JSON.parse(readFileSync(this.arquivo, "utf-8"));
    }
}

class jsonProdutosRepositorio {
    constructor(private readonly arquivo: string) {}

    existe(): boolean {
        return existsSync(this.arquivo);
    }

    salvar(m: mercado): void {
        const dados: produtodata[] = m.produtos.map(u => {
            const base = {
                id_produto: u.id_produto,
                nome: u.nome,
                preco: u.preco,
                vendedor: u.vendedor.id_user,
                quantidade: u.quantidade,
                horario_inicio: {
                    horas: u.horario_inicio.horas,
                    minutos: u.horario_inicio.minutos
                },
                horario_final: {
                    horas: u.horario_final.horas,
                    minutos: u.horario_final.minutos
                }
            };

            return u instanceof comida
                ? { ...base, tipo_produto: "comida", tipo: u.tipo }
                : { ...base, tipo_produto: "geral" };
        });

        writeFileSync(this.arquivo, JSON.stringify(dados, null, 2), "utf-8");
    }

    carregar(): produtodata[] {
        if (!this.existe()) return [];
        return JSON.parse(readFileSync(this.arquivo, "utf-8"));
    }
}

class jsonTransacaoRepositorio {
    constructor(private readonly arquivo: string) {}

    existe(): boolean {
        return existsSync(this.arquivo);
    }

    salvar(m: mercado): void {
        // O histórico do vendedor já contém as transações pendentes e finalizadas.
        const transacoes = m.usuarios.flatMap(u => u.historico_transacoes);

        const dados: transacaodata[] = transacoes.map(x => ({
            id_transaction: x.id_transaction,
            id_pedido: x.id_pedido,
            id_vendedor: x.vendedor.id_user,
            id_comprador: x.comprador.id_user,
            quantidade: x.quantidade,
            id_produto: x.produto.id_produto,
            confirmacao_comprador: x.confirmacao_comprador,
            confirmacao_vendedor: x.confirmacao_vendedor,
            expira_em: x.expira_em,
            data_criacao: x.data_criacao,
            data_finalizacao: x.data_finalizacao,
            status: x.status
        }));

        writeFileSync(this.arquivo, JSON.stringify(dados, null, 2), "utf-8");
    }

    carregar(): transacaodata[] {
        if (!this.existe()) return [];
        return JSON.parse(readFileSync(this.arquivo, "utf-8"));
    }
}

// =========================
// Classes de domínio
// =========================

class horario {
    horas: number;
    minutos: number;

    constructor(horas: number, minutos: number) {
        this.horas = horas;
        this.minutos = minutos;
    }
}

interface produto {
    id_produto: string;
    nome: string;
    preco: number;
    vendedor: usuario;
    quantidade: number;
    horario_inicio: horario;
    horario_final: horario;
}

class geral implements produto {
    id_produto: string;
    nome: string;
    preco: number;
    vendedor: usuario;
    quantidade: number;
    horario_inicio: horario;
    horario_final: horario;

    constructor(
        nome: string,
        preco: number,
        vendedor: usuario,
        quantidade: number,
        horario_inicio: horario,
        horario_final: horario
    ) {
        this.id_produto = crypto.randomUUID();
        this.nome = nome;
        this.preco = preco;
        this.vendedor = vendedor;
        this.quantidade = quantidade;
        this.horario_inicio = horario_inicio;
        this.horario_final = horario_final;
    }
}

class comida implements produto {
    id_produto: string;
    nome: string;
    preco: number;
    vendedor: usuario;
    quantidade: number;
    horario_inicio: horario;
    horario_final: horario;
    tipo: string;

    constructor(
        nome: string,
        preco: number,
        vendedor: usuario,
        quantidade: number,
        horarioinicio: horario,
        horariofinal: horario,
        tipo: string
    ) {
        this.id_produto = crypto.randomUUID();
        this.nome = nome;
        this.preco = preco;
        this.vendedor = vendedor;
        this.quantidade = quantidade;
        this.horario_inicio = horarioinicio;
        this.horario_final = horariofinal;
        this.tipo = tipo;
    }
}

class transacao {
    private timer?: NodeJS.Timeout;

    id_transaction: string;
    id_pedido: string;
    vendedor: usuario;
    comprador: usuario;
    quantidade: number;
    produto: produto;
    confirmacao_comprador: boolean;
    confirmacao_vendedor: boolean;
    expira_em: number;
    data_criacao: number;
    data_finalizacao?: number;
    status: "pendente" | "concluida" | "cancelada";

    constructor(
        vendedor: usuario,
        comprador: usuario,
        quantidade: number,
        produto: produto,
        id_pedido: string,
        private onExpirar: (transacao: transacao) => void
    ) {
        this.timer = setTimeout(() => this.onExpirar(this), cinco_dias_ms);
        this.timer.unref?.();

        this.expira_em = Date.now() + cinco_dias_ms;
        this.data_criacao = Date.now();
        this.id_transaction = crypto.randomUUID();
        this.id_pedido = id_pedido;
        this.vendedor = vendedor;
        this.comprador = comprador;
        this.produto = produto;
        this.quantidade = quantidade;
        this.confirmacao_comprador = false;
        this.confirmacao_vendedor = false;
        this.status = "pendente";
    }

    cancelar_timer(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = undefined;
    }
}

class usuario {
    id_user: string;
    nome: string;
    numero_telefone: string;
    numero_de_compras: number;
    numero_de_vendas: number;
    transacoes_cliente: transacao[];
    transacoes_vendedor: transacao[];
    historico_transacoes: transacao[];

    constructor(nome: string, numero_telefone: string) {
        this.id_user = crypto.randomUUID();
        this.nome = nome;
        this.numero_telefone = numero_telefone;
        this.numero_de_compras = 0;
        this.numero_de_vendas = 0;
        this.transacoes_cliente = [];
        this.transacoes_vendedor = [];
        this.historico_transacoes = [];
    }

    criar_transacao(
        vendedor: usuario,
        comprador: usuario,
        quantidade: number,
        produto: produto,
        id_pedido: string
    ): transacao {
        return new transacao(vendedor, comprador, quantidade, produto, id_pedido, (expirada) => {
            if (this.remover_transacao(expirada)) {
                expirada.status = "cancelada";
                expirada.cancelar_timer();
                expirada.produto.quantidade += expirada.quantidade;
                console.log("Transação expirada e removida:", expirada.id_transaction);
            }
        });
    }

    remover_transacao(t: transacao): boolean {
        const i = t.vendedor.transacoes_vendedor.findIndex(
            x => x.id_transaction === t.id_transaction
        );
        if (i !== -1) t.vendedor.transacoes_vendedor.splice(i, 1);

        const j = t.comprador.transacoes_cliente.findIndex(
            x => x.id_transaction === t.id_transaction
        );
        if (j !== -1) t.comprador.transacoes_cliente.splice(j, 1);

        return i !== -1 && j !== -1;
    }

    // Passe o mesmo idPedido em todas as reservas que pertencem à mesma compra.
    reserva(item: produto, quantidade: number, idPedido: string = crypto.randomUUID()): void {
        if (item.quantidade - quantidade < 0 || quantidade <= 0) return;

        const nova = this.criar_transacao(
            item.vendedor,
            this,
            quantidade,
            item,
            idPedido
        );

        item.quantidade -= quantidade;
        this.transacoes_cliente.push(nova);
        item.vendedor.transacoes_vendedor.push(nova);
        item.vendedor.historico_transacoes.push(nova);
    }

    finalizando_compra(t: transacao): void {
        if (!(t.confirmacao_comprador && t.confirmacao_vendedor)) return;
        if (t.status !== "pendente") return;

        t.cancelar_timer();
        if (!this.remover_transacao(t)) return;

        t.status = "concluida";
        t.data_finalizacao = Date.now();

        t.comprador.numero_de_compras++;
        t.vendedor.numero_de_vendas++;
    }

    confirmar_compra(transacao: transacao): void {
        if (this.id_user !== transacao.comprador.id_user) return;
        transacao.confirmacao_comprador = true;
        this.finalizando_compra(transacao);
    }

    confirmar_venda(transacao: transacao): void {
        if (this.id_user !== transacao.vendedor.id_user) return;
        transacao.confirmacao_vendedor = true;
        this.finalizando_compra(transacao);
    }
}


// Relatório de clientes


interface resumoCliente {
    cliente: usuario;
    compras: transacao[];
    valorTotal: number;
    ultimaCompra: number;
}

class relatorioClientes {
    constructor(private vendedor: usuario) {}

    private comprasConcluidas(): transacao[] {
        return this.vendedor.historico_transacoes.filter(
            t => t.status === "concluida"
        );
    }

    private valorTransacao(t: transacao): number {
        return t.produto.preco * t.quantidade;
    }

    private resumoClientes(): resumoCliente[] {
        const compras = this.comprasConcluidas();
        const resultado: resumoCliente[] = [];

        for (const t of compras) {
            let cliente = resultado.find(
                x => x.cliente.id_user === t.comprador.id_user
            );

            if (!cliente) {
                cliente = {
                    cliente: t.comprador,
                    compras: [],
                    valorTotal: 0,
                    ultimaCompra: 0
                };
                resultado.push(cliente);
            }

            cliente.compras.push(t);
            cliente.valorTotal += this.valorTransacao(t);
            cliente.ultimaCompra = Math.max(
                cliente.ultimaCompra,
                t.data_finalizacao ?? t.data_criacao
            );
        }

        return resultado;
    }

    // Clientes que geraram mais dinheiro em vendas
    topClientes(): resumoCliente[] {
        return this.resumoClientes().sort(
            (a, b) => b.valorTotal - a.valorTotal
        );
    }

    // Conta pedidos diferentes, pois um pedido pode ter vários produtos
    private quantidadePedidos(compras: transacao[]): number {
        return new Set(compras.map(t => t.id_pedido)).size;
    }

    // Fiel -> quem fez pelo menos 3 pedidos
    clientesFieis(): resumoCliente[] {
        return this.resumoClientes()
            .filter(c => this.quantidadePedidos(c.compras) >= 3)
            .sort((a, b) => this.quantidadePedidos(b.compras) - this.quantidadePedidos(a.compras));
    }

    ticketMedio(idCliente: string): number {
        const cliente = this.resumoClientes().find(
            c => c.cliente.id_user === idCliente
        );

        if (!cliente || cliente.compras.length === 0) return 0;
        return cliente.valorTotal / this.quantidadePedidos(cliente.compras);
    }

    produtosPreferidos(idCliente: string): { nome: string; quantidade: number }[] {
        const compras = this.comprasConcluidas().filter(
            t => t.comprador.id_user === idCliente
        );
        const produtos: { nome: string; quantidade: number }[] = [];

        for (const t of compras) {
            let p = produtos.find(x => x.nome === t.produto.nome);

            if (!p) {
                p = { nome: t.produto.nome, quantidade: 0 };
                produtos.push(p);
            }

            p.quantidade += t.quantidade;
        }

        return produtos.sort((a, b) => b.quantidade - a.quantidade);
    }

    horariosCompra(): { hora: number; quantidade: number }[] {
        const horarios: { hora: number; quantidade: number }[] = [];

        const pedidos: { [id: string]: transacao } = {};

        for (const t of this.comprasConcluidas()) {
            if (!pedidos[t.id_pedido]) pedidos[t.id_pedido] = t;
        }

        for (const t of Object.values(pedidos)) {
            const hora = new Date(t.data_criacao).getHours();
            let h = horarios.find(x => x.hora === hora);

            if (!h) {
                h = { hora, quantidade: 0 };
                horarios.push(h);
            }

            h.quantidade++;
        }

        return horarios.sort((a, b) => b.quantidade - a.quantidade);
    }

    clientesInativos(diasSemComprar: number = 30): resumoCliente[] {
        const limite = diasSemComprar * 24 * 60 * 60 * 1000;
        return this.resumoClientes().filter(
            c => Date.now() - c.ultimaCompra >= limite
        );
    }

    taxaCancelamento(): number {
        const historico = this.vendedor.historico_transacoes;
        const canceladas = historico.filter(t => t.status === "cancelada").length;
        const concluidas = historico.filter(t => t.status === "concluida").length;
        const total = canceladas + concluidas;

        if (total === 0) return 0;
        return (canceladas / total) * 100;
    }

    valorPorCliente(): { nome: string; valor: number }[] {
        return this.resumoClientes().map(c => ({
            nome: c.cliente.nome,
            valor: c.valorTotal
        })).sort((a, b) => b.valor - a.valor);
    }

    scoreCliente(idCliente: string): number {
        const cliente = this.resumoClientes().find(
            c => c.cliente.id_user === idCliente
        );

        if (!cliente) return 0;

        const frequencia = Math.min(this.quantidadePedidos(cliente.compras) * 10, 50);
        const valor = Math.min(cliente.valorTotal / 20, 30);
        const dias = (Date.now() - cliente.ultimaCompra) / (1000 * 60 * 60 * 24);

        let recencia = 0;
        if (dias <= 30) recencia = 20;
        else if (dias <= 60) recencia = 10;

        return Math.min(100, Math.round(frequencia + valor + recencia));
    }

    // Conta pares de produtos que aparecem no mesmo id_pedido.
    produtosVendidosJuntos(): { produto1: string; produto2: string; vezes: number }[] {
        const pedidos: { [id: string]: transacao[] } = {};

        for (const t of this.comprasConcluidas()) {
            if (!pedidos[t.id_pedido]) pedidos[t.id_pedido] = [];
            pedidos[t.id_pedido].push(t);
        }

        const pares: { produto1: string; produto2: string; vezes: number }[] = [];

        for (const pedido of Object.values(pedidos)) {
            const nomes = [...new Set(pedido.map(t => t.produto.nome))];

            for (let i = 0; i < nomes.length; i++) {
                for (let j = i + 1; j < nomes.length; j++) {
                    let par = pares.find(
                        p => p.produto1 === nomes[i] && p.produto2 === nomes[j]
                    );

                    if (!par) {
                        par = {
                            produto1: nomes[i],
                            produto2: nomes[j],
                            vezes: 0
                        };
                        pares.push(par);
                    }

                    par.vezes++;
                }
            }
        }

        return pares.sort((a, b) => b.vezes - a.vezes);
    }

    // Imprimir relatório no terminal
    
    exibirRelatorio(): void {
        console.log("\n========== RELATÓRIO DE CLIENTES ==========");

        console.log("\nTOP CLIENTES:");
        for (const c of this.topClientes().slice(0, 5)) {
            console.log(`${c.cliente.nome}: R$ ${c.valorTotal.toFixed(2)}`);
        }

        console.log("\nCLIENTES FIÉIS:");
        for (const c of this.clientesFieis()) {
            console.log(`${c.cliente.nome}: ${this.quantidadePedidos(c.compras)} compras`);
        }

        console.log("\nVALOR TOTAL POR CLIENTE:");
        for (const c of this.valorPorCliente()) {
            console.log(`${c.nome}: R$ ${c.valor.toFixed(2)}`);
        }

        console.log("\nCLIENTES INATIVOS:");
        for (const c of this.clientesInativos()) {
            console.log(
                `${c.cliente.nome}: última compra em ${new Date(c.ultimaCompra).toLocaleDateString("pt-BR")}`
            );
        }

        console.log("\nHORÁRIOS DE COMPRA:");
        for (const h of this.horariosCompra()) {
            console.log(`${h.hora}h: ${h.quantidade} compras`);
        }

        console.log(`\nTAXA DE CANCELAMENTO: ${this.taxaCancelamento().toFixed(2)}%`);

        console.log("\nPRODUTOS VENDIDOS JUNTOS:");
        for (const p of this.produtosVendidosJuntos()) {
            console.log(`${p.produto1} + ${p.produto2}: ${p.vezes} vezes`);
        }

        console.log("\n===========================================\n");
    }
}
