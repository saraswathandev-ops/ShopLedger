const test = require('node:test');
const assert = require('node:assert/strict');
const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

function orderLine(product, qty) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    hsn: product.hsn,
    price: product.price,
    qty
  };
}

const product = {
  id: 1,
  sku: 'RICE-1',
  name: 'Rice',
  hsn: '1006',
  price: 100,
  stock: 1,
  reserved: 0
};

const oneSellableRejection = {
  ok: false,
  msg: 'Rice is out of stock (1 sellable available)'
};

test('check accepts qty 1 when sellable is 1', () => {
  assert.deepEqual(inventory.check([product], [orderLine(product, 1)]), { ok: true });
});

test('CURRENT BEHAVIOUR: check rejects qty 2 when sellable is 1', () => {
  assert.deepEqual(inventory.check([product], [orderLine(product, 2)]), oneSellableRejection);
});

test('CURRENT BEHAVIOUR: check accepts qty 0 when sellable is 1', () => {
  assert.deepEqual(inventory.check([product], [orderLine(product, 0)]), { ok: true });
});

test('stock 4 minus reserved 3 leaves one sellable unit that check accepts', () => {
  const productWithReservations = { ...product, stock: 4, reserved: 3 };

  assert.equal(inventory.getSellableStock(productWithReservations), 1);
  assert.deepEqual(
    inventory.check([productWithReservations], [orderLine(productWithReservations, 1)]),
    { ok: true }
  );
});

test('cancelling a pending order restores stock and leaves reserved unchanged', () => {
  const stockedProduct = { ...product, stock: 4, reserved: 1 };
  const order = {
    id: 1001,
    status: 'pending',
    paymentMode: 'cash',
    items: [orderLine(stockedProduct, 2)]
  };
  const db = { products: [stockedProduct], orders: [order] };

  function stockSnapshot() {
    const { stock, reserved } = db.products[0];
    return { stock, reserved };
  }

  const beforeOrder = stockSnapshot();
  assert.deepEqual(inventory.check(db.products, order.items), { ok: true });
  inventory.reserve(db.products, order.items);
  const afterReserve = stockSnapshot();
  const result = orders.cancel(db, order.id, 'Cancelled in test');
  const afterCancel = stockSnapshot();

  assert.equal(result.ok, true);
  assert.equal(db.orders[0].status, 'cancelled');
  assert.deepEqual({ beforeOrder, afterReserve, afterCancel }, {
    beforeOrder: { stock: 4, reserved: 1 },
    afterReserve: { stock: 2, reserved: 1 },
    afterCancel: { stock: 4, reserved: 1 }
  });
});

test('buys exactly the sellable quantity and restocks the order only once', () => {
  const stockedProduct = { ...product, stock: 4, reserved: 1 };
  const order = {
    id: 1001,
    status: 'pending',
    paymentMode: 'cash',
    items: [orderLine(stockedProduct, 2), orderLine(stockedProduct, 1)]
  };
  const db = { products: [stockedProduct], orders: [order] };

  assert.deepEqual(inventory.check(db.products, [orderLine(stockedProduct, 3)]), { ok: true });
  assert.deepEqual(inventory.check(db.products, order.items), { ok: true });
  assert.equal(
    inventory.check(db.products, [orderLine(stockedProduct, 2), orderLine(stockedProduct, 2)]).ok,
    false
  );
  inventory.reserve(db.products, order.items);
  assert.equal(stockedProduct.stock, 1);
  assert.equal(stockedProduct.reserved, 1);

  assert.equal(orders.cancel(db, order.id).ok, true);
  assert.equal(stockedProduct.stock, 4);
  assert.equal(stockedProduct.reserved, 1);

  assert.equal(orders.cancel(db, order.id).ok, false);
  assert.equal(stockedProduct.stock, 4);
  assert.equal(stockedProduct.reserved, 1);
});
