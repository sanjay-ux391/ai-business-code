module {
  // Order status variant
  public type OrderStatus = {
    #pending;
    #confirmed;
    #completed;
    #cancelled;
  };

  // Order record (shared)
  public type Order = {
    id : Nat;
    customerId : Nat;
    items : Text;
    totalAmount : Nat;
    status : OrderStatus;
    createdAt : Text;
    aiDiscount : Nat;
    campaignType : Text;
  };

  // Input for create/update
  public type OrderInput = {
    customerId : Nat;
    items : Text;
    totalAmount : Nat;
    status : OrderStatus;
    createdAt : Text;
    aiDiscount : Nat;
    campaignType : Text;
  };
};
