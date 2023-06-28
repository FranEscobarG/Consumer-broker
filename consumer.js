import amqp from "amqplib";
import fetch from "node-fetch";

const rabbitSettings = {
  protocol: "amqp",
  hostname: "23.22.218.241",
  port: 5672,
  username: "franck",
  password: "221193",
};

async function connect() {
  const queue = "eventInitial";
  try {
    const conn = await amqp.connect(rabbitSettings);
    console.log("Conexión exitosa");
    const channel = await conn.createChannel();
    console.log("Canal creado exitosamente");

    channel.consume(queue, async (msn) => {
      const data = msn.content.toString();
      console.log("Recibido: ", data);
      const user = JSON.parse(data);

      // Envío del objeto user a la API para guardar usuarios
      try {
        const response = await fetch("http://52.44.218.69:3000/users/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user),
        });
        if (response.ok) {
          console.log("Usuario guardado correctamente");
        } else {
          console.error("Error al guardar usuario");
        }
      } catch (error) {
        console.error("Error en el fetch: ", error);
      }

      channel.ack(msn);
    });

  } catch (error) {
    console.error("Error => ", error);
  }
}

connect();
