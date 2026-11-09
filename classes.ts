
class horario{
    horas:number;
    minutos:number;
    constructor(horas:number, minutos:number){
        this.horas = horas;
        this.minutos = minutos;
    };
}
interface produto{
    id_produto:string;
    nome:string;
    preco:number;
    vendedor:usuario;
    quantidade:number;
    horario_inicio:horario;
    horario_final:horario;

}
class geral implements produto{
    id_produto:string;
    nome:string;
    preco:number;
    vendedor:usuario;
    quantidade:number;
    horario_inicio:horario;
    horario_final:horario;

    constructor(
    nome:string,
    preco:number,
    vendedor:usuario,
    quantidade:number,
    horario_inicio:horario,
    horario_final:horario)
    
    {
        this.id_produto = crypto.randomUUID();
        this.nome = nome;
        this.preco = preco;
        this.vendedor = vendedor;
        this.quantidade = quantidade;
        this.horario_inicio = horario_inicio;
        this.horario_final = horario_final;
    }
}
class comida implements produto{
    id_produto: string;
    nome:string;
    preco:number;
    vendedor:usuario;
    quantidade:number;
    horario_inicio:horario;
    horario_final:horario;
    tipo:string;
    constructor(
        nome:string,
        preco:number, 
        vendedor:usuario,
        quantidade:number,
        horarioinicio:horario,
        horariofinal:horario,
        tipo:string
    )
    {
        this.id_produto = crypto.randomUUID();
        this.nome = nome;
        this.preco = preco;
        this.vendedor = vendedor;
        this.quantidade = quantidade;
        this.horario_inicio = horarioinicio;
        this.horario_final = horariofinal;
        this.tipo = tipo;
    };
}

class transacao{
    id_transaction:string;
    vendedor:usuario;
    comprador:usuario;
    quantidade:number;
    produto:produto;
    confirmacao_comprador:boolean;
    confirmacao_vendedor:boolean;
    constructor(
        vendedor:usuario,
        comprador:usuario,
        quantidade:number, 
        produto:produto)
        
        {
        this.id_transaction = crypto.randomUUID();
        this.vendedor = vendedor;
        this.comprador = comprador;
        this.produto = produto;
        this.quantidade = quantidade;
        this.confirmacao_comprador = false;
        this.confirmacao_vendedor = false;
    };
}

class usuario{
    id_user:string;
    nome:string;
    numero_telefone:string;
    numero_de_compras:number;
    numero_de_vendas:number;
    transacoes_cliente: transacao[];
    transacoes_vendedor: transacao[];
    
    constructor(
        nome:string, 
        numero_telefone:string )
        
        {
        this.id_user = crypto.randomUUID();
        this.nome = nome;
        this.numero_telefone = numero_telefone;
        this.numero_de_compras = 0;
        this.numero_de_vendas = 0;
        this.transacoes_cliente = [];
        this.transacoes_vendedor = [];
    };
    criar_transacao(vendedor : usuario , comprador : usuario, quantidade : number, produto:produto) : transacao{
        const nova = new transacao(vendedor, comprador, quantidade, produto);
        return nova;
    }
    
    reserva(item : produto, quantidade : number) : void{
        if (item.quantidade - quantidade < 0 || quantidade <= 0) return;
        const nova = this.criar_transacao(item.vendedor , this, quantidade, item);
        item.quantidade -= quantidade;
        this.transacoes_cliente.push(nova);
        item.vendedor.transacoes_vendedor.push(nova);
    }
    confirmar_compra(transacao:transacao):void{
        if(this.id_user != transacao.comprador.id_user) return;
        transacao.confirmacao_comprador = true;
        if(transacao.confirmacao_comprador == transacao.confirmacao_vendedor){
            const i = transacao.comprador.transacoes_cliente.findIndex(x => x.id_transaction === transacao.id_transaction)
            if(i!=-1){
                transacao.comprador.transacoes_cliente.splice(i,1);
            }
            const j = transacao.vendedor.transacoes_vendedor.findIndex(x => x.id_transaction === transacao.id_transaction)
            if(j!=-1){
                transacao.vendedor.transacoes_vendedor.splice(j,1);
            }
            if(i==-1 || j==-1) return;
            transacao.comprador.numero_de_compras++;
            transacao.vendedor.numero_de_vendas++;
        }
    }
    confirmar_venda(transacao:transacao):void{

        if(this.id_user != transacao.vendedor.id_user) return;
        transacao.confirmacao_vendedor = true;

        if(transacao.confirmacao_comprador == transacao.confirmacao_vendedor){
            
            const i = transacao.comprador.transacoes_cliente.findIndex(x => x.id_transaction === transacao.id_transaction)
            if(i!=-1){
                transacao.comprador.transacoes_cliente.splice(i,1);
            }
            const j = transacao.vendedor.transacoes_vendedor.findIndex(x => x.id_transaction === transacao.id_transaction)
            if(j!=-1){
                transacao.vendedor.transacoes_vendedor.splice(j,1);
            }
            if(i==-1 || j==-1) return;
            transacao.comprador.numero_de_compras++;
            transacao.vendedor.numero_de_vendas++;
        }
    }

}