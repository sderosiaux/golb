
  key       value
- parent_id [ { child_id1, child_id2 }]

flatMap(_.children): repartition occurs

but if we know that all child_id1 fall into the same partition as the parent_id (AA => AA_1, AA_2 and a custom algo)

right now: groupByKey().aggregate() (repartition!)
better, custom: transformValues() + custom aggregate ourselves in store (no repar)

better: groupByKeyNoRepar() // reuse same partitions

