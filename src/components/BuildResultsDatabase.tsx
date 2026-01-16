import { Card, Container } from "react-bootstrap";

export default function BuildResultsDatabase() {
  return (
    <Container className="py-4">
      <Card bg="dark" text="white" className="border-secondary">
        <Card.Header
          as="h2"
          className="text-center"
          style={{
            background: "linear-gradient(135deg, #646cff 0%, #535bf2 100%)",
            color: "white",
          }}
        >
          📊 Build Results Database
        </Card.Header>
        <Card.Body className="text-center py-5">
          <div className="display-1 mb-4">🚧</div>
          <Card.Title className="h4 mb-3">
            Funzionalità in fase di sviluppo
          </Card.Title>
          <Card.Text className="text-muted fs-5">
            Questa sezione permetterà di costruire un database dei risultati
            dalle gare di RaceRoom Racing Experience.
          </Card.Text>
        </Card.Body>
      </Card>
    </Container>
  );
}
