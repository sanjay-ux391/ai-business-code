import Common "../types/common";
import T "../types/customer";
import CustomerLib "../lib/customer";
import Map "mo:core/Map";

mixin (customers : Map.Map<Nat, T.Customer>) {
  var nextCustomerId : Nat = 0;

  func getNextCustomerId() : Nat {
    if (nextCustomerId == 0) {
      // Initialize from store to handle pre-seeded data
      var maxId : Nat = 0;
      for ((k, _) in customers.entries()) {
        if (k > maxId) { maxId := k };
      };
      nextCustomerId := maxId + 1;
    };
    let id = nextCustomerId;
    nextCustomerId += 1;
    id;
  };

  public func createCustomer(input : T.CustomerInput) : async Common.Result<Nat, Text> {
    let id = getNextCustomerId();
    let (newId, _) = CustomerLib.create(customers, id, input);
    #ok(newId);
  };

  public query func getCustomer(id : Nat) : async ?T.Customer {
    CustomerLib.get(customers, id);
  };

  public func updateCustomer(id : Nat, input : T.CustomerInput) : async Common.Result<(), Text> {
    CustomerLib.update(customers, id, input);
  };

  public func deleteCustomer(id : Nat) : async Common.Result<(), Text> {
    CustomerLib.delete(customers, id);
  };

  public query func listCustomers() : async [T.Customer] {
    CustomerLib.list(customers);
  };
};
