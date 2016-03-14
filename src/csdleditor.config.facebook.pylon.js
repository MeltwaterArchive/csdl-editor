var CSDLEditorConfig = CSDLEditorConfig || {
    name : 'datasift',

    targetHelpJsonpSource : 'http://dev.datasift.com/tooltip-endpoint/tooltip/retrieve?id={target}',

    operators : [
        'cs',
        'contains',
        'contains_any',
        'any',
        'substr',
        'contains_near',
        'near',
        'exists',
        'in',
        'url_in',
        '==',
        '!=',
        '>',
        '>=',
        '<',
        '<=',
        'regex_partial',
        'regex_exact',
        'pcre',
        'contains_phrase',
        'all',
        'contains_all',
        'wild',
        'wildcard',
        'list_in',
        'list_any'
    ],

    logical : [
        'and',
        'or'
    ],

    unary : [
        'not'
    ],

    keywords : [
        'stream',
        'tag',
        'tags',
        'return'
    ],

    punctuationControl : [
        '[keep(default)]',
        '[keep(classic)]',
        '[keep(extended)]'
    ],

    targets : [
        'fb.author.age',
        'fb.author.country',
        'fb.author.country_code',
        'fb.author.gender',
        'fb.author.highest_education',
        'fb.author.region',
        'fb.author.country_region',
        'fb.author.relationship_status',
        'fb.author.type',
        'fb.language',
        'fb.link',
        'fb.og_action_type',
        'fb.og_action_type_id',
        'fb.og_object',
        'fb.og_object_id',
        'fb.parent.author.age',
        'fb.parent.author.country',
        'fb.parent.author.country_code',
        'fb.parent.author.gender',
        'fb.parent.author.highest_education',
        'fb.parent.author.region',
        'fb.parent.author.country_region',
        'fb.parent.author.relationship_status',
        'fb.parent.author.type',
        'fb.parent.hashtags',
        'fb.parent.language',
        'fb.parent.link',
        'fb.parent.media_type',
        'fb.parent.og_action_type',
        'fb.parent.og_action_type_id',
        'fb.parent.og_object',
        'fb.parent.og_object_id',
        'fb.parent.topic_ids',
        'fb.parent.topics.category',
        'fb.parent.topics.name',
        'fb.topic_ids',
        'fb.topics.category',
        'fb.topics.name',
        'fb.topics.category_name',
        'fb.parent.topics.category_name',
        'fb.sentiment',
        'fb.parent.sentiment',
        'interaction.hashtags',
        'interaction.media_type',
        'interaction.ml.categories',
        'interaction.subtype',
        'interaction.tags',
        'links.code',
        'links.domain',
        'links.normalized_url',
        'links.url'
    ]
};
