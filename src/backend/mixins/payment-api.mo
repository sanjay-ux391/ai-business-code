import Common "../types/common";
import T "../types/payment";
import PaymentLib "../lib/payment";
import Map "mo:core/Map";

mixin (payments : Map.Map<Nat, T.Payment>) {
  var nextPaymentId : Nat = 0;

  func getNextPaymentId() : Nat {
    if (nextPaymentId == 0) {
      var maxId : Nat = 0;
      for ((k, _) in payments.entries()) {
        if (k > maxId) { maxId := k };
      };
      nextPaymentId := maxId + 1;
    };
    let id = nextPaymentId;
    nextPaymentId += 1;
    id;
  };

  public func createPayment(input : T.PaymentInput) : async Common.Result<Nat, Text> {
    let id = getNextPaymentId();
    let (newId, _) = PaymentLib.create(payments, id, input);
    #ok(newId);
  };

  public query func getPayment(id : Nat) : async ?T.Payment {
    PaymentLib.get(payments, id);
  };

  public func updatePayment(id : Nat, input : T.PaymentInput) : async Common.Result<(), Text> {
    PaymentLib.update(payments, id, input);
  };

  public func deletePayment(id : Nat) : async Common.Result<(), Text> {
    PaymentLib.delete(payments, id);
  };

  public query func listPayments() : async [T.Payment] {
    PaymentLib.list(payments);
  };

  public query func searchPayments(queryText : Text) : async [T.Payment] {
    PaymentLib.search(payments, queryText);
  };

  public query func filterPayments(status : ?Text, method : ?Text) : async [T.Payment] {
    PaymentLib.filterByStatusAndMethod(payments, status, method);
  };

  public query func getCustomerPayments(customerName : Text) : async [T.Payment] {
    PaymentLib.byCustomer(payments, customerName);
  };
};
