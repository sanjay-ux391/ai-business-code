import Common "../types/common";
import T "../types/appointment";
import AppointmentLib "../lib/appointment";
import Map "mo:core/Map";

mixin (appointments : Map.Map<Nat, T.Appointment>) {
  var nextAppointmentId : Nat = 0;

  func getNextAppointmentId() : Nat {
    if (nextAppointmentId == 0) {
      var maxId : Nat = 0;
      for ((k, _) in appointments.entries()) {
        if (k > maxId) { maxId := k };
      };
      nextAppointmentId := maxId + 1;
    };
    let id = nextAppointmentId;
    nextAppointmentId += 1;
    id;
  };

  public func createAppointment(input : T.AppointmentInput) : async Common.Result<Nat, Text> {
    let id = getNextAppointmentId();
    let (newId, _) = AppointmentLib.create(appointments, id, input);
    #ok(newId);
  };

  public query func getAppointment(id : Nat) : async ?T.Appointment {
    AppointmentLib.get(appointments, id);
  };

  public func updateAppointment(id : Nat, input : T.AppointmentInput) : async Common.Result<(), Text> {
    AppointmentLib.update(appointments, id, input);
  };

  public func deleteAppointment(id : Nat) : async Common.Result<(), Text> {
    AppointmentLib.delete(appointments, id);
  };

  public query func listAppointments() : async [T.Appointment] {
    AppointmentLib.list(appointments);
  };
};
