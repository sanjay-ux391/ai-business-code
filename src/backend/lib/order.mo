import Common "../types/common";
import T "../types/order";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type Order = T.Order;
  public type OrderInput = T.OrderInput;
  public type Result<A, B> = Common.Result<A, B>;

  public func create(
    store : Map.Map<Nat, Order>,
    nextId : Nat,
    input : OrderInput,
  ) : (Nat, Order) {
    let record : Order = {
      id = nextId;
      customerId = input.customerId;
      items = input.items;
      totalAmount = input.totalAmount;
      status = input.status;
      createdAt = input.createdAt;
      aiDiscount = input.aiDiscount;
      campaignType = input.campaignType;
    };
    store.add(nextId, record);
    (nextId, record);
  };

  public func get(store : Map.Map<Nat, Order>, id : Nat) : ?Order {
    store.get(id);
  };

  public func update(
    store : Map.Map<Nat, Order>,
    id : Nat,
    input : OrderInput,
  ) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Order not found") };
      case (?existing) {
        store.add(id, { existing with
          customerId = input.customerId;
          items = input.items;
          totalAmount = input.totalAmount;
          status = input.status;
          createdAt = input.createdAt;
          aiDiscount = input.aiDiscount;
          campaignType = input.campaignType;
        });
        #ok(());
      };
    };
  };

  public func delete(store : Map.Map<Nat, Order>, id : Nat) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Order not found") };
      case (?_) {
        store.remove(id);
        #ok(());
      };
    };
  };

  public func list(store : Map.Map<Nat, Order>) : [Order] {
    store.values().toArray();
  };
};
