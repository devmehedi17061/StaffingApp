import { Modal, Button } from 'react-bootstrap';

export default function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  return (
    <Modal show={show} onHide={onCancel} centered className="dark-modal">
      <Modal.Header closeButton><Modal.Title>{title || 'Confirm'}</Modal.Title></Modal.Header>
      <Modal.Body><div dangerouslySetInnerHTML={{ __html: message }} /></Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>Delete</Button>
      </Modal.Footer>
    </Modal>
  );
}
