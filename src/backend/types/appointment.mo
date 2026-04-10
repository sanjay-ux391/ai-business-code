module {
  // Appointment status variant
  public type AppointmentStatus = {
    #scheduled;
    #completed;
    #cancelled;
  };

  // Appointment record (shared)
  public type Appointment = {
    id : Nat;
    customerId : Nat;
    customerName : Text;
    date : Text;
    time : Text;
    service : Text;
    status : AppointmentStatus;
    notes : Text;
  };

  // Input for create/update
  public type AppointmentInput = {
    customerId : Nat;
    customerName : Text;
    date : Text;
    time : Text;
    service : Text;
    status : AppointmentStatus;
    notes : Text;
  };
};
