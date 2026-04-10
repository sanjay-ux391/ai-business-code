import Common "../types/common";
import T "../types/order";
import OrderLib "../lib/order";
import Map "mo:core/Map";

mixin (orders : Map.Map<Nat, T.Order>) {
  var nextOrderId : Nat = 0;

  func getNextOrderId() : Nat {
    if (nextOrderId == 0) {
      var maxId : Nat = 0;
      for ((k, _) in orders.entries()) {
        if (k > maxId) { maxId := k };
      };
      nextOrderId := maxId + 1;
    };
    let id = nextOrderId;
    nextOrderId += 1;
    id;
  };

  public func createOrder(input : T.OrderInput) : async Common.Result<Nat, Text> {
    let id = getNextOrderId();
    let (newId, _) = OrderLib.create(orders, id, input);
    #ok(newId);
  };

  public query func getOrder(id : Nat) : async ?T.Order {
    OrderLib.get(orders, id);
  };

  public func updateOrder(id : Nat, input : T.OrderInput) : async Common.Result<(), Text> {
    OrderLib.update(orders, id, input);
  };

  public func deleteOrder(id : Nat) : async Common.Result<(), Text> {
    OrderLib.delete(orders, id);
  };

  public query func listOrders() : async [T.Order] {
    OrderLib.list(orders);
  };
};
