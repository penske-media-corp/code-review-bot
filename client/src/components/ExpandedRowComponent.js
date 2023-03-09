import {logDebug} from '../services/log';
import {format} from 'date-fns';

export const useExpandedRowComponent = ({onUpdate, user}) => {
    const expandedRowComponent = ({data}) => {
        logDebug('expandedRowComponent', user, data);
        const handleClick = ({target}) => {
            const {name, value} = target;

            fetch(`/api/action/${name}/${value}`,{
                credentials: 'same-origin',
            })
                .then((res) => res.json())
                .then((result) => {
                    result?.data && onUpdate && onUpdate({
                        data: result.data,
                        action: name,
                    });
                })
                .catch((e) => {
                    // @TODO
                    logDebug(e);
                })
        };
        const Button = ({id, name}) => {
            const sanitizedName = name.toLowerCase().replace(' ', '-');

            return (
                <button
                    id={`${sanitizedName}-${id}`}
                    name={sanitizedName}
                    value={id}
                    onClick={handleClick}
                >{name}</button>
            );
        };
        const showClaim = !user || !data.reviewers?.includes(user?.displayName);
        const showApprove = !user || !data.approvers?.includes(user?.displayName);
        const showChange = !user || !data.requestChanges?.includes(user?.displayName);

        console.log(data);
        return (
            <div style={{paddingLeft: '3em'}}>
                <div className="expandedNav">
                    <div className="left">
                        {showClaim && (<Button name="Claim" id={data.id}/>)}
                        {showChange && (<Button name="Request Change" id={data.id}/>)}
                        {showApprove && (<Button name="Approve" id={data.id}/>)}
                        <Button name="Close" id={data.id}/>
                        <Button name="Remove" id={data.id}/>
                    </div>
                    <div className="right">Last updated on {format(new Date(data.updatedAt), 'MMM dd, yyyy hh:mmaaaaa')}</div>
                </div>
                <div>{data.note}</div>
            </div>
        );
    };

    return expandedRowComponent;
}
