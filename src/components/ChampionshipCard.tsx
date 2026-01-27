import { useState } from "react";
import { Card, Button, ListGroup, Badge, Modal } from "react-bootstrap";
import type { ChampionshipEntry } from "../types";

interface ChampionshipCardProps {
  readonly championship: ChampionshipEntry;
  readonly onDelete: (alias: string) => void;
  readonly onClick: (alias: string) => void;
  readonly onDownload: (championship: ChampionshipEntry) => void;
}

function ChampionshipCard({
  championship,
  onDelete,
  onClick,
  onDownload,
}: ChampionshipCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(championship.alias);
    setShowDeleteModal(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleCardClick = () => {
    onClick(championship.alias);
  };

  const generatedDate = new Date(championship.generatedAt);
  const day = String(generatedDate.getDate()).padStart(2, "0");
  const month = String(generatedDate.getMonth() + 1).padStart(2, "0");
  const year = generatedDate.getFullYear();
  const hours = String(generatedDate.getHours()).padStart(2, "0");
  const minutes = String(generatedDate.getMinutes()).padStart(2, "0");
  const seconds = String(generatedDate.getSeconds()).padStart(2, "0");
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  return (
    <>
      <Card
        className="bg-dark border-secondary h-100"
        style={{ cursor: "pointer" }}
        onClick={handleCardClick}
      >
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className="flex-grow-1 overflow-hidden">
              <Card.Title className="text-white mb-1 d-flex align-items-center gap-2">
                {championship.carIcon && (
                  <img
                    src={championship.carIcon}
                    alt={championship.carName || championship.alias}
                    style={{
                      width: 32,
                      height: 32,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span className="text-truncate">{championship.alias}</span>
              </Card.Title>
              {championship.carName && (
                <Card.Subtitle className="text-white-50 small mb-2">
                  {championship.carName}
                </Card.Subtitle>
              )}
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteClick}
              title="Delete championship"
              className="ms-2"
            >
              Remove
            </Button>
          </div>

          <ListGroup variant="flush" className="border-0">
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0">
              <div className="d-flex justify-content-between">
                <span className="text-white-50 small">Races:</span>
                <Badge bg="primary">{championship.races}</Badge>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0">
              <div className="d-flex justify-content-between">
                <span className="text-white-50 small">Generated:</span>
                <span className="text-white small">{formattedDate}</span>
              </div>
            </ListGroup.Item>
            <ListGroup.Item className="bg-dark border-secondary py-2 px-0 border-bottom-0">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-white-50 small">HTML File:</span>
                <code
                  className="text-white small text-truncate"
                  style={{ maxWidth: "200px" }}
                  title={championship.fileName}
                >
                  {championship.fileName}
                </code>
              </div>
            </ListGroup.Item>
          </ListGroup>
          <div className="d-flex justify-content-end mt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(championship);
              }}
              disabled={
                !championship.raceData || championship.raceData.length === 0
              }
            >
              ⬇️ Download as HTML
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
        data-bs-theme="dark"
      >
        <Modal.Header closeButton className="bg-dark border-secondary">
          <Modal.Title>Delete Championship</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark">
          <p className="text-white">
            Are you sure you want to delete the championship{" "}
            <strong>{championship.alias}</strong>?
          </p>
          <p className="text-white-50 small mb-0">
            This will only remove it from the database. The generated HTML file
            will not be deleted.
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-dark border-secondary">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ChampionshipCard;
