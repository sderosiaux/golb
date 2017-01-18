import React from 'react'
import { ShareButtons, ShareCounts, generateShareIcon } from 'react-share'
import { Flex, Box } from 'reflexbox'
import css from './ShareButtons.module.scss'

const { FacebookShareButton, GooglePlusShareButton, LinkedinShareButton, TwitterShareButton } = ShareButtons
const FacebookIcon = generateShareIcon('facebook');
const GooglePlusIcon = generateShareIcon('google');
const TwitterIcon  = generateShareIcon('twitter');
const LinkedinIcon = generateShareIcon('linkedin');

// TODO(sd): Reddit, Pocket

export default ({ url, title }) => <Flex>
        <Box px={0}><TwitterShareButton url={url} className={css.icon}><TwitterIcon size={32} title={title} round={true} /></TwitterShareButton></Box>
        <Box px={0}><LinkedinShareButton url={url} className={css.icon}><LinkedinIcon size={32} title={title} round={true} /></LinkedinShareButton></Box>
        <Box px={0}><GooglePlusShareButton url={url} className={css.icon}><GooglePlusIcon size={32} title={title} round={true} /></GooglePlusShareButton></Box>          
        {/*<Box px={0}><FacebookShareButton url={url} className={css.icon}><FacebookIcon size={32} title={title} round={true} /></FacebookShareButton></Box>*/}
    </Flex>