module {
  // Payment method variant
  public type PaymentMethod = {
    #cash;
    #card;
    #upi;
  };

  // Payment status variant
  public type PaymentStatus = {
    #completed;
    #pending;
    #refunded;
  };

  // Payment record (shared)
  public type Payment = {
    id : Nat;
    customer : Text;
    items : Text;
    amount : Nat;
    method : PaymentMethod;
    date : Text;
    status : PaymentStatus;
    discount : Nat;
  };

  // Input for create/update
  public type PaymentInput = {
    customer : Text;
    items : Text;
    amount : Nat;
    method : PaymentMethod;
    date : Text;
    status : PaymentStatus;
    discount : Nat;
  };
};
