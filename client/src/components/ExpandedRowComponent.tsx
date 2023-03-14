import type {
    CodeReview,
    UpdateEventProps,
} from '../lib/types';
import React, {useCallback} from 'react';
import {useState} from 'react';
import ExpandedRowDataView from './ExpandedRowDataView';
import ExpandedRowDataEdit from './ExpandedRowDataEdit';
import {ExpandedRowProps} from '../lib/types';

export const useExpandedRowComponent = ({onUpdate, user}: ExpandedRowProps) => {
    const ExpandedRowComponent = ({data}: {data: CodeReview}) => {
        const [errorMessage, setErrorMessage] = useState('');
        const [editing, setEditing] = useState(false);

        const handleUpdate = (props: UpdateEventProps) => {
            const {data, action} = props;
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

    return useCallback(ExpandedRowComponent, [onUpdate, user]);
}
