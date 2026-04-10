module {
  // Customer segment variant
  public type CustomerSegment = {
    #VIP;
    #Regular;
    #AtRisk;
    #New;
  };

  // Customer record (shared — no var fields)
  public type Customer = {
    id : Nat;
    name : Text;
    phone : Text;
    avatar : Text;
    totalSpent : Nat;
    visitCount : Nat;
    lastVisit : Text;
    segment : CustomerSegment;
  };

  // Input for create/update (omits auto-generated id)
  public type CustomerInput = {
    name : Text;
    phone : Text;
    avatar : Text;
    totalSpent : Nat;
    visitCount : Nat;
    lastVisit : Text;
    segment : CustomerSegment;
  };
};
