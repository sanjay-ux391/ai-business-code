module {
  // Shared result type
  public type Result<T, E> = { #ok : T; #err : E };

  // Shared ID types
  public type CustomerId = Nat;
  public type PaymentId = Nat;
  public type OrderId = Nat;
  public type FeedbackId = Nat;
  public type AppointmentId = Nat;

  // Dashboard stats returned for the live dashboard panel
  public type DashboardStats = {
    totalCustomers : Nat;
    totalRevenue : Nat;
    ordersToday : Nat;
    activeNow : Nat;
  };
};
