import {
  usuario,
  produto,
  comida,
  transacao,
  horario,
  mercado
} from "./classes.ts";

export class VendedorService {
  constructor(private mercado: mercado) {}

  // 1. Editar produto
  editarProduto(
    vendedor: usuario,
    item: produto,
    dados: { nome?: string; preco?: number; inicio?: horario; fim?: horario; tipo?: string }
  ): boolean {
    if (item.vendedor.id_user !== vendedor.id_user) return false;

    if (dados.nome !== undefined) item.nome = dados.nome;
    if (dados.preco !== undefined && dados.preco >= 0) item.preco = dados.preco;
    if (dados.inicio !== undefined) item.horario_inicio = dados.inicio;
    if (dados.fim !== undefined) item.horario_final = dados.fim;
    if (dados.tipo !== undefined && item instanceof comida) {
      item.tipo = dados.tipo;
    }
    return true;
  }

  // 2. Pausar / Reativar produto
  alternarPausa(vendedor: usuario, item: produto): boolean {
    if (item.vendedor.id_user !== vendedor.id_user) return false;
    item.pausado = !item.pausado;
    return true;
  }

  // 3. Remover produto
  removerProduto(vendedor: usuario, item: produto): boolean {
    if (item.vendedor.id_user !== vendedor.id_user) return false;

    const index = this.mercado.produtos.findIndex(p => p.id_produto === item.id_produto);
    if (index === -1) return false;

    this.mercado.produtos.splice(index, 1);
    return true;
  }

  // 4. Controlar estoque
  atualizarEstoque(vendedor: usuario, item: produto, novaQtd: number): boolean {
    if (item.vendedor.id_user !== vendedor.id_user || novaQtd < 0) return false;
    item.quantidade = novaQtd;
    return true;
  }

  // 5. Definir / Alterar ponto de venda
  definirPontoVenda(vendedor: usuario, item: produto, local: string): boolean {
    if (item.vendedor.id_user !== vendedor.id_user || !local.trim()) return false;
    item.ponto_venda = local;
    return true;
  }

  // 6. Ver reservas recebidas
  listarReservasRecebidas(vendedor: usuario): transacao[] {
    return vendedor.transacoes_vendedor;
  }

  // 7. Aceitar reserva (usa o atributo que o grupo já criou!)
  aceitarReserva(vendedor: usuario, t: transacao): boolean {
    if (t.vendedor.id_user !== vendedor.id_user) return false;
    t.confirmacao_vendedor = true;
    return true;
  }

  // 8. Recusar ou Cancelar reserva (reaproveita o método do grupo!)
  recusarOuCancelarReserva(vendedor: usuario, t: transacao): boolean {
    if (t.vendedor.id_user !== vendedor.id_user) return false;
    vendedor.cancelar_reserva(t); // Método original do classes.ts que já devolve ao estoque
    return true;
  }

  // 9. Marcar como retirada (reaproveita a finalização dupla do grupo!)
  marcarComoRetirada(vendedor: usuario, t: transacao): boolean {
    if (t.vendedor.id_user !== vendedor.id_user) return false;
    t.confirmacao_comprador = true;
    vendedor.confirmar_venda(t); // Método original do classes.ts que encerra e soma +1 venda/compra
    return true;
  }
}