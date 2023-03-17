import React, {
    MouseEvent,
    useRef,
    useState
} from 'react';
import {DataEditProps} from '../lib/types';
import {fetchData} from '../services/fetch';
import {logError} from '../services/log';
import ExpandedRowDataView from './ExpandedRowDataView';

const ExpandedRowDataEdit = ({data, onError, onUpdate}: DataEditProps) => {
    // This reference object is use to collect updated data by individual form input control.
    const collectedData = useRef({...data});

    // Use this state to track and temporarily disabled all buttons when Save button is clicked.
    const [saveClicked, setSaveClicked] = useState(false);

    const handleSaveClicked = ({currentTarget}: MouseEvent<HTMLButtonElement>) => {
        if (JSON.stringify(collectedData.current) !== JSON.stringify(data)) {
            const value = currentTarget.getAttribute('value');
            const {note, jiraTicket} = collectedData.current;

            setSaveClicked(true);

            fetchData(`/api/action/save/${value}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    note,
                    jiraTicket,
                })
            })
                .then((result) => {
                    if (!result.data) {
                        onError('Error saving data, see console error log for details.');
                        logError(`Error saving: /api/action/save/${value}`, result);
                        return;
                    }
                    onUpdate({
                        data: result.data,
                        action: 'save',
                    });
                })
                .catch((e) => {
                    onError('Error saving data, see console error log for details.');
                    logError(`Error sending: /api/action/save/${value}`, e);
                })
                .finally(() => {
                    setSaveClicked(false);
                })

        } else {
            onUpdate({data, acton: 'save'});
        }
    }

    return (
        <form id={`edit-form-${data.id}`} name={`edit-form-${data.id}`}>
            <div><label htmlFor={`edit-jira-ticket-${data.id}`}><strong>Jira Ticket</strong>:</label></div>
            <input
                id={`edit-jira-ticket-${data.id}`}
                name={`edit-jira-ticket-${data.id}`}
                defaultValue={data.jiraTicket}
                onChange={({target}) => collectedData.current.jiraTicket = target.value}
            />
            <div><label htmlFor={`edit-note-${data.id}`}><strong>Notes</strong>:</label></div>
            <textarea rows={3} cols={80}
                id={`edit-note-${data.id}`}
                name={`edit-note-${data.id}`}
                defaultValue={data.note}
                onChange={({target}) => collectedData.current.note = target.value}
            ></textarea>
            <div>
                <button
                    id={`cancel-${data.id}`}
                    name={`cancel-${data.id}`}
                    disabled={saveClicked}
                    onClick={() => onUpdate({data, action: 'cancel'})}
                    type="button"
                >Cancel</button>
                <button
                    id={`save-${data.id}`}
                    name={`save-${data.id}`}
                    disabled={saveClicked}
                    onClick={handleSaveClicked}
                    type="button"
                >Save</button>
            </div>
        </form>
    );
}

ExpandedRowDataEdit.defaultProps = {
    onError: () => {},
};


export default ExpandedRowDataEdit;
