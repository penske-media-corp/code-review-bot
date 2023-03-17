
import React from 'react';
import {useState} from 'react';
import ExpandedRowDataView from './ExpandedRowDataView';
import ExpandedRowDataEdit from './ExpandedRowDataEdit';
import {CodeReview, User} from '../lib/types';

export interface ExpandedRowProps {
    data: CodeReview;
    onUpdate: CallableFunction;
    user: User;
}

export interface DataViewProps extends ExpandedRowProps {
    onError: CallableFunction;
}

export type DataEditProps = DataViewProps;

interface UpdateEventProps {
    data: CodeReview;
    action: string;
}

const ExpandedRow = ({data, onUpdate, user}: ExpandedRowProps) => {
    const [errorMessage, setErrorMessage] = useState('');
    const [editing, setEditing] = useState(false);

    const handleUpdate = (props: UpdateEventProps) => {
        const {action} = props;

        setErrorMessage('');
        switch (action) {
            case 'save':
                setEditing(false);
                onUpdate(props);
                break;
            case 'edit':
                setEditing(true);
                break;
            case 'cancel':
                setEditing(false);
                break;
            default:
                setEditing(false);
                onUpdate(props);
                break;
        }
    };

    const handleError = (message: string) => {
        setErrorMessage(message);
    };

    return (
        <div style={{paddingLeft: '3em'}} className="expanded-row">
            {!editing && (
                <ExpandedRowDataView
                    data={data}
                    onError={handleError}
                    onUpdate={handleUpdate}
                    user={user}
                />
            )}
            {editing && (
                <ExpandedRowDataEdit
                    data={data}
                    onError={handleError}
                    onUpdate={handleUpdate}
                    user={user}
                />
            )}
            {errorMessage && (<span className="error">{errorMessage}</span>)}
        </div>
    );
};

export default ExpandedRow;
