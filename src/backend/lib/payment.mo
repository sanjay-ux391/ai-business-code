import Common "../types/common";
import T "../types/payment";
import Map "mo:core/Map";
import Iter "mo:core/Iter";

module {
  public type Payment = T.Payment;
  public type PaymentInput = T.PaymentInput;
  public type Result<A, B> = Common.Result<A, B>;

  public func create(
    store : Map.Map<Nat, Payment>,
    nextId : Nat,
    input : PaymentInput,
  ) : (Nat, Payment) {
    let record : Payment = {
      id = nextId;
      customer = input.customer;
      items = input.items;
      amount = input.amount;
      method = input.method;
      date = input.date;
      status = input.status;
      discount = input.discount;
    };
    store.add(nextId, record);
    (nextId, record);
  };

  public func get(store : Map.Map<Nat, Payment>, id : Nat) : ?Payment {
    store.get(id);
  };

  public func update(
    store : Map.Map<Nat, Payment>,
    id : Nat,
    input : PaymentInput,
  ) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Payment not found") };
      case (?existing) {
        store.add(id, { existing with
          customer = input.customer;
          items = input.items;
          amount = input.amount;
          method = input.method;
          date = input.date;
          status = input.status;
          discount = input.discount;
        });
        #ok(());
      };
    };
  };

  public func delete(store : Map.Map<Nat, Payment>, id : Nat) : Result<(), Text> {
    switch (store.get(id)) {
      case null { #err("Payment not found") };
      case (?_) {
        store.remove(id);
        #ok(());
      };
    };
  };

  public func list(store : Map.Map<Nat, Payment>) : [Payment] {
    store.values().toArray();
  };

  public func search(store : Map.Map<Nat, Payment>, queryText : Text) : [Payment] {
    let lower = queryText.toLower();
    store.values().filter(
      func(p : Payment) : Bool {
        p.customer.toLower().contains(#text lower) or
        p.items.toLower().contains(#text lower);
      },
    ).toArray();
  };

  public func filterByStatusAndMethod(
    store : Map.Map<Nat, Payment>,
    status : ?Text,
    method : ?Text,
  ) : [Payment] {
    store.values().filter(
      func(p : Payment) : Bool {
        let statusMatch = switch (status) {
          case null { true };
          case (?s) {
            switch (p.status) {
              case (#completed) { s == "completed" };
              case (#pending) { s == "pending" };
              case (#refunded) { s == "refunded" };
            };
          };
        };
        let methodMatch = switch (method) {
          case null { true };
          case (?m) {
            switch (p.method) {
              case (#cash) { m == "cash" };
              case (#card) { m == "card" };
              case (#upi) { m == "upi" };
            };
          };
        };
        statusMatch and methodMatch;
      },
    ).toArray();
  };

  public func byCustomer(store : Map.Map<Nat, Payment>, customerName : Text) : [Payment] {
    store.values().filter(
      func(p : Payment) : Bool {
        p.customer == customerName;
      },
    ).toArray();
  };
};
