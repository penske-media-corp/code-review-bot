import Select from 'react-select';
import {logDebug} from '../services/log';

const ButtonLink = ({name, linkUrl}) => {
    const sanitizedName = name.toLowerCase().replace(' ', '-');
    const handleClick = () => {
        window.location.href = linkUrl;
    };

    return (
        <button
            onClick={handleClick}
        >{name}</button>
    );
};

const Navbar = (props) => {
    return (
        <div id="nav">
            <ButtonLink name="Pending" linkUrl="/?status=pending" />
            <ButtonLink name="In Progress" linkUrl="/?status=inprogress" />
            <ButtonLink name="My Reviews" linkUrl="/?status=mine" />
        </div>
    );
};

export default Navbar;
