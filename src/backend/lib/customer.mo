import Common "../types/common";
import T "../types/customer";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type Customer = T.Customer;
  public type CustomerInput = T.CustomerInput;
  public type Result<A, B> = Common.Result<A, B>;

  public func create(
    store : Map.Map<Nat, Customer>,
    nextId : Nat,
    input : CustomerInput,
  ) : (Nat, Customer) {
    let record : Customer = {
      id = nextId;
      name = input.name;
      phone = input.phone;
      avatar = input.avatar;
      totalSpent = input.totalSpent;
      visitCount = input.visitCount;
      lastVisit = input.lastVisit;
      segment = input.segment;
    };
    store.add(nextId, record);
    (nextId, record);
  };

  public func get(store : Map.Map<Nat, Customer>, id : Nat) : ?Customer {
    store.get(id);
  };

  public func update(
    store : Map.Map<Nat, Customer>,
    id : Nat,
    input : CustomerInput,
  ) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Customer not found") };
      case (?existing) {
        store.add(id, { existing with
          name = input.name;
          phone = input.phone;
          avatar = input.avatar;
          totalSpent = input.totalSpent;
          visitCount = input.visitCount;
          lastVisit = input.lastVisit;
          segment = input.segment;
        });
        #ok(());
      };
    };
  };

  public func delete(store : Map.Map<Nat, Customer>, id : Nat) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Customer not found") };
      case (?_) {
        store.remove(id);
        #ok(());
      };
    };
  };

  public func list(store : Map.Map<Nat, Customer>) : [Customer] {
    store.values().toArray();
  };
};
